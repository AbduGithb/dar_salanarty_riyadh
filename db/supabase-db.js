/*
  Simple wrapper around window.supabaseClient for common operations.
  All functions assume `supabaseInit()` has been called and `window.supabaseClient` is available.
  They return plain JS objects or throw errors; callers should handle errors.
*/
(function () {
  if (window.supabaseDB) return;

  function ensure() {
    if (!window.supabaseClient)
      throw new Error("Supabase client not initialized");
    return window.supabaseClient;
  }

  // دالة لاختبار الاتصال بقاعدة البيانات
  async function testConnection() {
    try {
      const supabase = ensure();
      const { data, error } = await supabase
        .from("members")
        .select("count")
        .limit(1);
      return !error;
    } catch (e) {
      console.error("Connection test failed:", e);
      return false;
    }
  }

  async function getAllMembersWithSubscriptions() {
    const supabase = ensure();
    const { data: members, error: mErr } = await supabase
      .from("members")
      .select("*, subscriptions(*)")
      .order("created_at", { ascending: false });
    if (mErr) throw mErr;

    return members;
  }

  async function getMemberById(memberId) {
    const supabase = ensure();
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("*")
      .eq("id", memberId)
      .single();
    if (mErr) throw mErr;
    const { data: subs, error: sErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("member_id", memberId)
      .order("year", { ascending: true });
    if (sErr) throw sErr;
    return { member, subscriptions: subs || [] };
  }

  async function searchMembersByNameOrPhone(term) {
    const supabase = ensure();
    // Search by phone exact match first
    const { data: byPhone, error: phoneError } = await supabase
      .from("members")
      .select("*")
      .eq("phone", term)
      .limit(10);

    if (phoneError) {
      console.error("Error searching by phone:", phoneError);
    }

    if (byPhone && byPhone.length > 0) return byPhone;

    // If no phone match, search by name
    const { data: byName, error: nameError } = await supabase
      .from("members")
      .select("*")
      .ilike("name", `%${term}%`)
      .limit(10);

    if (nameError) {
      console.error("Error searching by name:", nameError);
      throw nameError;
    }

    return byName || [];
  }

  async function getSubscriptionsByMemberId(memberId) {
    const supabase = ensure();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, member_id, year, subscription_type, amount_due, amount_paid, amount_remaining, status, settlement, notes, created_at"
      )
      .eq("member_id", memberId)
      .order("year", { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function updateSubscription(id, payload) {
    const supabase = ensure();

    // إزالة الحقول غير الموجودة في الجدول
    const cleanPayload = { ...payload };
    delete cleanPayload.updated_at;
    delete cleanPayload.created_at;

    const { data, error } = await supabase
      .from("subscriptions")
      .update(cleanPayload)
      .eq("id", id);

    if (error) {
      console.error(`خطأ في تحديث الاشتراك ${id}:`, error);
      throw error;
    }

    // جلب البيانات المحدثة
    const { data: updatedData, error: fetchError } = await supabase
      .from("subscriptions")
      .select(
        "id, member_id, year, subscription_type, amount_due, amount_paid, amount_remaining, status, settlement, notes, created_at"
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error(`خطأ في جلب الاشتراك المحدث ${id}:`, fetchError);
      throw fetchError;
    }

    return updatedData;
  }

  async function addSubscription(payload) {
    const supabase = ensure();

    // تحضير البيانات للتأكد من وجود جميع الحقول المطلوبة
    const subscriptionData = {
      member_id: payload.member_id,
      year: payload.year,
      subscription_type: payload.subscription_type || "none",
      amount_due: payload.amount_due || 0,
      amount_paid: payload.amount_paid || 0,
      amount_remaining: payload.amount_remaining || 0,
      status: payload.status || "unpaid",
      settlement: payload.settlement || false,
      notes: payload.notes || "",
      created_at: payload.created_at || new Date().toISOString(),
    };

    console.log("إضافة اشتراك جديد:", subscriptionData);

    const { data, error } = await supabase
      .from("subscriptions")
      .insert([subscriptionData])
      .select();

    if (error) {
      console.error("خطأ في إضافة الاشتراك:", error);
      // إذا كان الخطأ بسبب تكرار (duplicate)، حاول التحديث بدلاً من الإضافة
      if (error.code === "23505") {
        // رمز الخطأ للقيد الفريد في PostgreSQL
        console.log("الاشتراك موجود بالفعل، جاري التحديث...");
        // جلب الاشتراك الموجود
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("member_id", payload.member_id)
          .eq("year", payload.year)
          .single();

        if (existing) {
          const { data: updated } = await supabase
            .from("subscriptions")
            .update(subscriptionData)
            .eq("id", existing.id)
            .select();

          return updated && updated[0];
        }
      }
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  }
  async function getAllSubscriptions() {
    const supabase = ensure();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, member_id, year, subscription_type, amount_due, amount_paid, amount_remaining, status, settlement, notes, created_at"
      )
      .order("year", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getSubscriptionById(id) {
    const supabase = ensure();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, member_id, year, subscription_type, amount_due, amount_paid, amount_remaining, status, settlement, notes, created_at"
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async function updateMember(id, payload) {
    const supabase = ensure();

    // نحدد فقط الحقول المسموح بتعديلها لمنع إرسال حقول زائدة قد تسبب خطأ
    const updateData = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    updateData.updated_at = new Date().toISOString();

    console.log(`[SupabaseDB] Attempting update for ID: ${id}`);
    console.log(`[SupabaseDB] Update payload:`, updateData);

    const { data, error, status, count } = await supabase
      .from("members")
      .update(updateData, { count: "exact" })
      .eq("id", id)
      .select();

    if (error) {
      console.error(`[SupabaseDB] Update member ERROR:`, error);
      throw error;
    }

    console.log(
      `[SupabaseDB] Update response status: ${status}, count: ${count}`
    );

    if (count === 0) {
      console.error(
        `[SupabaseDB] Update FAILED: 0 rows affected for ID ${id}. This is 100% an RLS policy restriction.`
      );
      throw new Error(
        `تعذر تحديث البيانات. قاعدة البيانات (Supabase) تمنع التعديل بسبب قيود الصلاحيات (RLS).`
      );
    }

    if (!data || data.length === 0) {
      console.warn(
        `[SupabaseDB] Update succeeded but no data returned. Possible SELECT policy restriction.`
      );
      return { id: id, ...updateData };
    }

    console.log(`[SupabaseDB] Update member success:`, data[0]);
    return data[0];
  }

  async function deleteSubscriptionsByMemberId(memberId) {
    const supabase = ensure();
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("member_id", memberId);
    if (error) throw error;
    return true;
  }

  async function deleteMember(id) {
    const supabase = ensure();
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async function addPaymentRecord(record) {
    const supabase = ensure();
    const { data, error } = await supabase
      .from("payments")
      .insert([record])
      .select();
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  async function createMember(memberData) {
    const supabase = ensure();

    // التأكد من وجود الحقول المطلوبة
    const newMember = {
      ...memberData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("members")
      .insert([newMember])
      .select();

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  window.supabaseDB = {
    testConnection,
    getAllMembersWithSubscriptions,
    getMemberById,
    searchMembersByNameOrPhone,
    getSubscriptionsByMemberId,
    updateSubscription,
    addSubscription,
    updateMember,
    deleteSubscriptionsByMemberId,
    deleteMember,
    addPaymentRecord,
    getAllSubscriptions,
    getSubscriptionById,
    createMember,
  };
})();
