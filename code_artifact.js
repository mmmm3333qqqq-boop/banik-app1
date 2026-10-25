/**
 * ====================================================================
 * منصة رسالة - ملف تهيئة ومزامنة Firebase Realtime Database
 * ====================================================================
 */

// مفاتيح الاعتماد الخاصة بمشروع فايربيس (Firebase Configuration)
const firebaseConfig = {
    apiKey: "AIzaSyBzthotcwzFkMHuJVG6EXf0mr6ZPnZpe8M",
    authDomain: "coeins-4b149.firebaseapp.com",
    databaseURL: "https://coeins-4b149-default-rtdb.firebaseio.com",
    projectId: "coeins-4b149",
    storageBucket: "coeins-4b149.firebasestorage.app",
    messagingSenderId: "30968526506",
    appId: "1:30968526506:web:5a437551aabbf4855402d3",
    measurementId: "G-94568KXQQ7"
};

// تهيئة تطبيق فايربيس في حال لم يكن مهيئاً مسبقاً
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("تمت تهيئة Firebase بنجاح.");
    } catch (error) {
        console.error("خطأ أثناء تهيئة Firebase:", error);
    }
}

// إنشاء مرجع لقاعدة البيانات الحية Realtime Database
const db = (typeof firebase !== 'undefined' && firebase.apps.length) ? firebase.database() : null;

/**
 * ====================================================================
 * دوال التزامن السحابي المباشر (Realtime Services)
 * ====================================================================
 */
const RisalaFirebaseService = {
    // ----------------- 1. المنشورات (Posts) -----------------
    /**
     * الاستماع اللحظي لتحديثات المنشورات (يحدث تلقائياً فور النشر من أي هاتف)
     */
    listenToPosts: (callback) => {
        if (!db) return () => {};
        const postsRef = db.ref('risala_posts');
        postsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        });
        return () => postsRef.off();
    },

    /**
     * حفظ قائمة المنشورات في فايربيس
     */
    savePosts: async (posts) => {
        if (!db) return false;
        try {
            await db.ref('risala_posts').set(posts);
            return true;
        } catch (err) {
            console.error("فشل حفظ المنشورات في السحابة:", err);
            return false;
        }
    },

    // ----------------- 2. المستخدمين والأرصدة (Users) -----------------
    /**
     * الاستماع اللحظي لتحديثات الحسابات والكوينز
     */
    listenToUsers: (callback) => {
        if (!db) return () => {};
        const usersRef = db.ref('risala_users');
        usersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        });
        return () => usersRef.off();
    },

    /**
     * حفظ وتحديث بيانات المستخدمين في السحابة
     */
    saveUsers: async (users) => {
        if (!db) return false;
        try {
            await db.ref('risala_users').set(users);
            return true;
        } catch (err) {
            console.error("فشل تحديث المستخدمين في السحابة:", err);
            return false;
        }
    },

    // ----------------- 3. الرسائل والمحادثات (Messages) -----------------
    /**
     * الاستماع المباشر للرسائل الواردة والصادرة
     */
    listenToMessages: (callback) => {
        if (!db) return () => {};
        const msgsRef = db.ref('risala_messages');
        msgsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        });
        return () => msgsRef.off();
    },

    /**
     * حفظ الرسائل في السحابة
     */
    saveMessages: async (messages) => {
        if (!db) return false;
        try {
            await db.ref('risala_messages').set(messages);
            return true;
        } catch (err) {
            console.error("فشل حفظ الرسائل في السحابة:", err);
            return false;
        }
    },

    // ----------------- 4. طلبات التمويل (Loans) -----------------
    /**
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

    /**
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
