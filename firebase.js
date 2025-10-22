/* firebase.js
   ملف مستقل لتهيئة Firebase والتعامل مع المجموعة العامة.
   قم بتعديل قيمة firebaseConfig و appId و initialAuthToken حسب بيئتك.
   هذا الملف يُصدّر دوالًا بسيطة لتمكين app.js من الاشتراك وإضافة سجلات.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* ======= قم بتعديل هذه الإعدادات =======
   ضع هنا إعدادات مشروع Firebase الخاص بك.
   مثال:
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     ...
   };
*/
const firebaseConfig = {
    /* ضع إعدادات Firebase هنا */
};

/* معرف التطبيق (يُستخدم لمسار المجموعة) */
const appId = 'your-app-id-here'; // عدّله حسب الحاجة

/* توكن المصادقة الاختياري */
const initialAuthToken = null; // ضع قيمة التوكن إذا استخدمت signInWithCustomToken

let app, db, auth, userId;

/* مسار المجموعة العام (يمكن تعديله) */
function getCollectionPath() {
    return `/artifacts/${appId}/public/data/companies_and_sectors`;
}

/* تهيئة Firebase */
export async function initFirebase() {
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
        console.warn('firebaseConfig فارغ - يرجى تحرير ملف firebase.js وإضافة إعدادات مشروع Firebase.');
        // نتابع التهيئة جزئياً حتى لا يكسر التطبيق أثناء التطوير المحلي
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
    } else {
        await signInAnonymously(auth);
    }
    userId = auth.currentUser?.uid || crypto.randomUUID();
    console.log('Firebase initialized. userId=', userId);

    // Seed data إذا كانت المجموعة فارغة - يعمل مرة واحدة
    await checkAndSeedData();

    return { app, db, auth, userId };
}

/* دالة للـ seeding (نفس بيانات المثال) */
async function checkAndSeedData() {
    try {
        const collRef = collection(getFirestore(app), getCollectionPath());
        const snapshot = await getDocs(collRef);
        if (snapshot.empty) {
            const initialData = [
                {
                    serialNumber: '001',
                    sector: 'الزراعة والصناعات الغذائية',
                    products: 'البقوليات والزيوت',
                    manufacturerAr: 'شركة الضياء للزراعة',
                    manufacturerEn: 'Al-Diaa Agriculture Co.',
                    imageUrl: 'https://placehold.co/100x100/10b981/ffffff?text=صناعات',
                    timestamp: serverTimestamp()
                },
                {
                    serialNumber: '002',
                    sector: 'التكنولوجيا المالية (FinTech)',
                    products: 'تطبيقات الدفع الإلكتروني',
                    manufacturerAr: 'مؤسسة إيزي باي',
                    manufacturerEn: 'EasyPay Corp',
                    imageUrl: 'https://placehold.co/100x100/3b82f6/ffffff?text=تقنية',
                    timestamp: serverTimestamp()
                },
            ];
            for (const item of initialData) {
                const newDocRef = doc(collection(getFirestore(app), getCollectionPath()));
                await setDoc(newDocRef, item);
            }
            console.log('Seeded initial data.');
        }
    } catch (e) {
        console.warn('Seed failed (this is non-fatal):', e);
    }
}

/* اشترك لتغيّرات المجموعة - callback يستقبل مصفوفة السجلات */
export function subscribeToCollection(onChangeCallback, onError) {
    const collRef = collection(getFirestore(app), getCollectionPath());
    const unsubscribe = onSnapshot(collRef, snapshot => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // ترتيب حسب الرقم التسلسلي
        items.sort((a,b) => (a.serialNumber||'').localeCompare(b.serialNumber||'', undefined, { numeric: true, sensitivity: 'base' }));
        onChangeCallback(items);
    }, error => {
        console.error('Firestore onSnapshot error:', error);
        if (onError) onError(error);
    });

    return unsubscribe;
}

/* إضافة سجلات (تُستخدم عند استيراد CSV) */
export async function addRecordsToCollection(records) {
    const collRef = collection(getFirestore(app), getCollectionPath());
    let success = 0;
    let fail = 0;
    for (const rec of records) {
        try {
            const finalRecord = { ...rec, timestamp: serverTimestamp(), importedBy: userId };
            await addDoc(collRef, finalRecord);
            success++;
        } catch (e) {
            console.error('Add record failed:', e, rec);
            fail++;
        }
    }
    return { success, fail };
}
