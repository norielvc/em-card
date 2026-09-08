import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/auth';
import { getClientIP } from '../../../lib/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 8 Official Distribution Categories with Rainbow Color Code metadata
export const DISTRIBUTION_CATEGORIES = {
  groceries: { id: 'groceries', name: 'Groceries', color: '#ef4444', colorName: 'Red' },
  food_packs: { id: 'food_packs', name: 'Food Packs', color: '#f97316', colorName: 'Orange' },
  cash_assistance: { id: 'cash_assistance', name: 'Cash Assistance', color: '#eab308', colorName: 'Yellow' },
  your_em: { id: 'your_em', name: 'yourEM', color: '#10b981', colorName: 'Emerald Green (Reserved)' },
  medicines: { id: 'medicines', name: 'Medicines', color: '#06b6d4', colorName: 'Cyan / Teal' },
  medical_assistance: { id: 'medical_assistance', name: 'Medical Assistance', color: '#3b82f6', colorName: 'Royal Blue' },
  electric_bill: { id: 'electric_bill', name: 'Electric Bill Assistance', color: '#6366f1', colorName: 'Indigo' },
  water_bill: { id: 'water_bill', name: 'Water Bill Assistance', color: '#a855f7', colorName: 'Purple / Violet' },
};

function cleanToken(rawToken) {
  return (rawToken || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s/g, '')
    .replace(/^\uFEFF/, '');
}

function extractTokenFromUrl(cleanToken) {
  const match = cleanToken.match(/\/card\/(EM[A-Za-z0-9-]+)/);
  return match ? match[1] : cleanToken;
}

function isValidToken(token) {
  return /^(EM[A-Za-z0-9]{24}|EM-\d{10})$/.test(token);
}

async function logAdminAction(action_type, target_table, target_id, target_name, details, admin_email, request) {
  try {
    await supabaseAdmin.from('admin_logs').insert({
      admin_email,
      action_type,
      target_table: target_table || null,
      target_id: target_id || null,
      target_name: target_name || null,
      details: details || {},
      ip_address: request ? getClientIP(request) : null,
    });
  } catch {
    // Non-blocking fire-and-forget
  }
}

// GET: Fetch distribution history & category stats with advanced analytics
export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const registrationId = searchParams.get('registrationId');
    const barangay = searchParams.get('barangay');

    // 1. Fetch system-wide lightweight distribution aggregate rows
    const { data: allDistRows } = await supabaseAdmin
      .from('aid_distributions')
      .select('id, registration_id, category, barangay, scanned_by, claim_number, distributed_at');

    const allRows = allDistRows || [];
    const totalDistributions = allRows.length;
    const uniqueResidentsSet = new Set(allRows.map(d => d.registration_id));
    const uniqueBeneficiaries = uniqueResidentsSet.size;

    // Time-based calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const todayCount = allRows.filter(d => d.distributed_at >= startOfToday).length;
    const thisWeekCount = allRows.filter(d => d.distributed_at >= startOfWeek).length;

    // Category distribution counts
    const stats = {};
    Object.keys(DISTRIBUTION_CATEGORIES).forEach((key) => {
      stats[key] = 0;
    });
    allRows.forEach((r) => {
      if (stats[r.category] !== undefined) {
        stats[r.category] += 1;
      }
    });

    // Barangay distribution breakdown
    const brgyMap = {};
    allRows.forEach((r) => {
      const b = (r.barangay || 'Unspecified').trim();
      brgyMap[b] = (brgyMap[b] || 0) + 1;
    });
    const barangayStats = Object.entries(brgyMap)
      .map(([brgy, count]) => ({
        barangay: brgy,
        count,
        percentage: totalDistributions > 0 ? Math.round((count / totalDistributions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Operator leaderboard
    const opMap = {};
    allRows.forEach((r) => {
      const op = (r.scanned_by || 'Admin / Staff').trim();
      opMap[op] = (opMap[op] || 0) + 1;
    });
    const operatorStats = Object.entries(opMap)
      .map(([operator, count]) => ({ operator, count }))
      .sort((a, b) => b.count - a.count);

    // Monthly Distribution Velocity (12 Months of current year)
    const currentYear = now.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTimeline = monthNames.map((m, idx) => ({
      month: m,
      monthIndex: idx,
      year: currentYear,
      label: m,
      count: 0,
    }));

    allRows.forEach((r) => {
      if (r.distributed_at) {
        const d = new Date(r.distributed_at);
        if (d.getFullYear() === currentYear) {
          const mIdx = d.getMonth();
          if (monthlyTimeline[mIdx]) {
            monthlyTimeline[mIdx].count += 1;
          }
        }
      }
    });

    // Most Aid Category Distributed (Sorted category rankings)
    const categoryRankings = Object.entries(stats)
      .map(([catId, count]) => {
        const meta = DISTRIBUTION_CATEGORIES[catId] || { id: catId, name: catId, color: '#059669', colorName: 'Green' };
        return {
          ...meta,
          count,
          percentage: totalDistributions > 0 ? Math.round((count / totalDistributions) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Multi-claim breakdown per resident & Most Received Residents
    const residentClaimCounts = {};
    const residentMap = {};
    allRows.forEach(r => {
      if (!r.registration_id) return;
      residentClaimCounts[r.registration_id] = (residentClaimCounts[r.registration_id] || 0) + 1;

      if (!residentMap[r.registration_id]) {
        residentMap[r.registration_id] = {
          registration_id: r.registration_id,
          totalClaims: 0,
          categories: {},
          barangay: r.barangay,
          lastDistributedAt: r.distributed_at,
        };
      }
      residentMap[r.registration_id].totalClaims += 1;
      residentMap[r.registration_id].categories[r.category] = (residentMap[r.registration_id].categories[r.category] || 0) + 1;
      if (r.distributed_at > residentMap[r.registration_id].lastDistributedAt) {
        residentMap[r.registration_id].lastDistributedAt = r.distributed_at;
      }
    });

    let singleClaimCount = 0;
    let multiClaimCount = 0;
    Object.values(residentClaimCounts).forEach(cnt => {
      if (cnt === 1) singleClaimCount += 1;
      else if (cnt > 1) multiClaimCount += 1;
    });

    // Top Beneficiaries (Most aid received residents)
    const topResidentIds = Object.values(residentMap)
      .sort((a, b) => b.totalClaims - a.totalClaims)
      .slice(0, 100);

    let topBeneficiaries = [];
    if (topResidentIds.length > 0) {
      const { data: topRegs } = await supabaseAdmin
        .from('registrations')
        .select('*, ValidResidents(*)')
        .in('id', topResidentIds.map(t => t.registration_id));

      topBeneficiaries = topResidentIds.map(item => {
        const reg = (topRegs || []).find(rg => rg.id === item.registration_id) || {};
        const val = reg.ValidResidents || {};
        const firstName = reg.first_name || val.first_name || '';
        const lastName = reg.last_name || val.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || 'Balagtas Resident';
        return {
          ...item,
          name,
          em_card_no: reg.em_card_no || 'EM-CARD',
          photo: reg.photo_url || reg.photo_base64,
          barangay: item.barangay || reg.barangay || val.barangay || 'Balagtas',
          registration: reg,
        };
      });
    }

    // 2. Fetch requested detailed records
    let query = supabaseAdmin
      .from('aid_distributions')
      .select('*, registrations(*, ValidResidents(*))')
      .order('distributed_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }
    if (barangay) {
      query = query.eq('barangay', barangay);
    }
    if (registrationId) {
      query = query.eq('registration_id', registrationId);
    }

    const { data: records, error } = await query;
    if (error) {
      return Response.json({
        records: [],
        stats,
        totalDistributions,
        uniqueBeneficiaries,
        todayCount,
        thisWeekCount,
        barangayStats,
        operatorStats,
        monthlyTimeline,
        categoryRankings,
        topBeneficiaries,
        singleClaimCount,
        multiClaimCount,
      });
    }

    return Response.json({
      records: records || [],
      stats,
      totalDistributions,
      uniqueBeneficiaries,
      todayCount,
      thisWeekCount,
      barangayStats,
      operatorStats,
      monthlyTimeline,
      categoryRankings,
      topBeneficiaries,
      singleClaimCount,
      multiClaimCount,
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Scan EM Card for Aid Distribution
export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rawToken, category, scanned_by, notes } = body;
    const allow_duplicates = body.allow_duplicates === true || body.allow_duplicates === 'true' || body.allowDuplicates === true || body.allowDuplicates === 'true';

    if (!rawToken || !category) {
      return Response.json({ error: 'Missing token or aid category' }, { status: 400 });
    }

    const catMeta = DISTRIBUTION_CATEGORIES[category];
    if (!catMeta) {
      return Response.json({ error: 'Invalid distribution category' }, { status: 400 });
    }

    // 1. Clean & extract token
    let token = cleanToken(rawToken);
    token = extractTokenFromUrl(token);

    if (!isValidToken(token)) {
      return Response.json({
        type: 'invalid',
        message: 'SECURITY ALERT: Invalid QR format. This is NOT a valid EM Card.',
        rawText: token,
      }, { status: 400 });
    }

    // 2. Fetch Registration + ValidResident
    const { data: reg, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('*, ValidResidents(*)')
      .eq('qr_token', token)
      .eq('status', 'Approved')
      .maybeSingle();

    if (regErr || !reg) {
      return Response.json({
        type: 'invalid',
        message: 'SECURITY ALERT: Unregistered or unauthorized EM Card. This citizen is not approved in our system.',
        rawText: token,
      }, { status: 404 });
    }

    const person = reg.ValidResidents || {};
    const fullName = `${person.first_name || reg.first_name || ''} ${person.middle_name || reg.middle_name ? (person.middle_name || reg.middle_name) + ' ' : ''}${person.last_name || reg.last_name || ''}${person.suffix || reg.suffix ? ' ' + (person.suffix || reg.suffix) : ''}`.trim();
    const memberBarangay = reg.barangay || person.barangay || '-';
    const memberPhoto = reg.photo_url || reg.photo_base64;

    // 3. Query all previous aid distribution claims for this citizen
    const { data: previousDistributions } = await supabaseAdmin
      .from('aid_distributions')
      .select('*')
      .eq('registration_id', reg.id)
      .order('distributed_at', { ascending: false });

    const claimsForThisCategory = (previousDistributions || []).filter(d => d.category === category);

    // 4. Duplicate Check (if allow_duplicates is FALSE)
    if (!allow_duplicates && claimsForThisCategory.length > 0) {
      const latestClaim = claimsForThisCategory[0];
      return Response.json({
        type: 'duplicate',
        name: fullName,
        category: catMeta.id,
        categoryName: catMeta.name,
        categoryColor: catMeta.color,
        barangay: memberBarangay,
        purok: reg.purok || '-',
        houseNo: reg.house_no || '-',
        contact: reg.contact || '-',
        photo: memberPhoto,
        emCardNo: reg.em_card_no || '-',
        qrToken: reg.qr_token,
        scannedAt: latestClaim.distributed_at,
        scannedBy: latestClaim.scanned_by || 'Staff',
        totalClaims: claimsForThisCategory.length,
        allDistributions: previousDistributions || [],
        message: `ALREADY CLAIMED: ${fullName} has already received ${catMeta.name} on ${new Date(latestClaim.distributed_at).toLocaleDateString()} at ${new Date(latestClaim.distributed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      });
    }

    // 5. Insert distribution record
    const claimNumber = claimsForThisCategory.length + 1;
    const now = new Date().toISOString();

    const { data: newDist, error: insertErr } = await supabaseAdmin
      .from('aid_distributions')
      .insert({
        registration_id: reg.id,
        category: catMeta.id,
        category_name: catMeta.name,
        scanned_by: scanned_by || user.email || 'Admin/Staff',
        notes: notes || null,
        barangay: memberBarangay,
        claim_number: claimNumber,
        distributed_at: now,
      })
      .select()
      .single();

    if (insertErr) {
      throw insertErr;
    }

    // 6. Update global scan stats on registration
    supabaseAdmin.from('registrations').update({
      last_scanned_at: now,
      scan_count: (reg.scan_count || 0) + 1,
    }).eq('id', reg.id).then(() => {}).catch(() => {});

    // 7. Audit Log in admin_logs
    logAdminAction(
      'distribution_scan',
      'aid_distributions',
      newDist.id,
      fullName,
      {
        category: catMeta.id,
        category_name: catMeta.name,
        em_card_no: reg.em_card_no,
        barangay: memberBarangay,
        claim_number: claimNumber,
        is_repeat: claimNumber > 1,
      },
      scanned_by || user.email,
      request
    );

    // Build updated full list of distributions for this member
    const updatedDistributions = [newDist, ...(previousDistributions || [])];

    return Response.json({
      type: 'success',
      name: fullName,
      category: catMeta.id,
      categoryName: catMeta.name,
      categoryColor: catMeta.color,
      barangay: memberBarangay,
      purok: reg.purok || '-',
      houseNo: reg.house_no || '-',
      contact: reg.contact || '-',
      photo: memberPhoto,
      emCardNo: reg.em_card_no || '-',
      qrToken: reg.qr_token,
      claimNumber: claimNumber,
      distributedAt: now,
      allDistributions: updatedDistributions,
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to process distribution scan' }, { status: 500 });
  }
}
