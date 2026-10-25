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
 * دالة مساعدة لتوحيد وقراءة البيانات سواء كانت مخزنة كمصفوفة قديمة أو ككائنات بمفاتيح push()
 */
const parseMessagesSnapshot = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.filter(Boolean);
    }
    return Object.entries(val).map(([key, item]) => {
        if (!item || typeof item !== 'object') return null;
        return {
            ...item,
            id: item.id || key // الحفاظ على المعرف الداخلي أو استخدام مفتاح Firebase
        };
    }).filter(Boolean);
};

/**
 * ====================================================================
 * دوال التزامن السحابي المباشر (Realtime Services)
 * ====================================================================
 */
const RisalaFirebaseService = {
    // ----------------- 1. المنشورات (Posts) -----------------
    listenToPosts: (callback) => {
        if (!db) return () => {};
        const postsRef = db.ref('risala_posts');
        const handler = (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        };
        postsRef.on('value', handler);
        return () => postsRef.off('value', handler);
    },

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
    listenToUsers: (callback) => {
        if (!db) return () => {};
        const usersRef = db.ref('risala_users');
        const handler = (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        };
        usersRef.on('value', handler);
        return () => usersRef.off('value', handler);
    },

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

    // ----------------- 3. الرسائل والمحادثات المحدثة (Messages) -----------------
    /**
     * الاستماع المباشر للرسائل الواردة والصادرة مع دعم الانتقال الآمن للبيانات القديمة
     */
    listenToMessages: (callback) => {
        if (!db) return () => {};
        const msgsRef = db.ref('risala_messages');
        const handler = (snapshot) => {
            const data = snapshot.val();
            const parsedList = parseMessagesSnapshot(data);
            // ترتيب الرسائل تصاعدياً حسب الوقت الزمني
            parsedList.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
            callback(parsedList);
        };
        msgsRef.on('value', handler);
        return () => msgsRef.off('value', handler);
    },

    /**
     * إرسال رسالة باستخدام push() ثم set() على مسارها المخصص فقط لمنع الـ Race Conditions
     */
    sendMessage: async (messagePayload) => {
        if (!db) throw new Error("قاعدة بيانات Firebase غير متصلة");
        const msgsRef = db.ref('risala_messages');
        const newMsgRef = msgsRef.push();
        const firebaseKey = newMsgRef.key;

        const completeMessage = {
            ...messagePayload,
            id: firebaseKey, // استخدام مفتاح Firebase الموحد والفريد
            time: messagePayload.time || new Date().toISOString(),
            read: false
        };

        await newMsgRef.set(completeMessage);
        return completeMessage;
    },

    /**
     * تحديث حالة قراءة رسالة محددة مباشرة دون إعادة كتابة القائمة كاملة
     */
    markMessageAsRead: async (messageId) => {
        if (!db || !messageId) return;
        try {
            await db.ref(`risala_messages/${messageId}/read`).set(true);
        } catch (e) {
            console.warn("تعذر تحديث حالة القراءة للرسالة:", messageId, e);
        }
    },

    /**
     * حذف رسالة مفردة عبر مسارها الفرعي المباشر
     */
    deleteMessageById: async (messageId) => {
        if (!db || !messageId) return false;
        try {
            await db.ref(`risala_messages/${messageId}`).remove();
            return true;
        } catch (e) {
            console.error("فشل حذف الرسالة:", messageId, e);
            return false;
        }
    },

    /**
     * مسح محادثة كاملة بين طرفين أو داخل مجموعة بطريقة دقيقة عبر Multi-location Update
     */
    clearConversation: async (currentUserId, targetId, isGroup = false) => {
        if (!db) return false;
        try {
            const msgsRef = db.ref('risala_messages');
            const snapshot = await msgsRef.once('value');
            const data = snapshot.val();
            if (!data) return true;

            const updates = {};
            if (Array.isArray(data)) {
                // إذا كانت مخزنة بالشكل القديم كمصفوفة
                const remaining = data.filter(m => {
                    if (!m) return false;
                    if (isGroup) return m.groupId !== targetId;
                    const isBetween = (m.from === currentUserId && m.to === targetId) || (m.from === targetId && m.to === currentUserId);
                    return !isBetween;
                });
                await msgsRef.set(remaining);
            } else {
                // مخزنة ككائنات بمفاتيح Firebase
                Object.entries(data).forEach(([key, m]) => {
                    if (!m) return;
                    let shouldDelete = false;
                    if (isGroup) {
                        shouldDelete = m.groupId === targetId;
                    } else {
                        shouldDelete = !m.groupId && ((m.from === currentUserId && m.to === targetId) || (m.from === targetId && m.to === currentUserId));
                    }
                    if (shouldDelete) {
                        updates[key] = null; // يمثل الحذف في Firebase
                    }
                });
                if (Object.keys(updates).length > 0) {
                    await msgsRef.update(updates);
                }
            }
            return true;
        } catch (e) {
            console.error("فشل مسح المحادثة:", e);
            return false;
        }
    },

    // ----------------- 4. طلبات التمويل (Loans) -----------------
    listenToLoans: (callback) => {
        if (!db) return () => {};
        const loansRef = db.ref('risala_loans');
        const handler = (snapshot) => {
            const data = snapshot.val();
            const list = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(list);
        };
        loansRef.on('value', handler);
        return () => loansRef.off('value', handler);
    },

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
    window.parseMessagesSnapshot = parseMessagesSnapshot;
}
