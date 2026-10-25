// ----------------- 4. طلبات التمويل (Loans) -----------------
    /
     * الاستماع لطلبات شحن وتمويل الحسابات الواردة للإدارة
     */
    listenToLoans: (callback) => {
        if (!db) return () => {};
        const loansRef = db.ref('risala_loans');
        loansRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        });
        return () => loansRef.off();
    },

    /
     * حفظ أو معالجة طلبات التمويل
     */
    saveLoans: async (loans) => {
        if (!db) return false;
        try {
            await db.ref('risala_loans').set(loans);
            return true;
        } catch (err) {
            console.error("فشل حفظ طلبات التمويل:", err);
            return false;
        }
    }
};

// إتاحة الكائن عالمياً لسهولة استخدامه داخل المتصفح أو بيئة React
if (typeof window !== 'undefined') {
    window.RisalaFirebaseService = RisalaFirebaseService;
    window.firebaseConfig = firebaseConfig;
    window.risalaDb = db;
}
