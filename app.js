/* app.js
   ملف المنطق المستقل: التعامل مع DOM، التصفية، العرض، واستيراد CSV.
   يتوقع استدعاء startApp مع كائن يحتوي على دوال Firebase المستوردة.
*/
let allTrademarks = [];
let firebaseAPI = null;

// خريطة رؤوس الأعمدة كما في الملف الأصلي
const headerMap = {
    'م': 'serialNumber',
    'المجال': 'sector',
    'المنتجات': 'products',
    'الشركات المصنعة -عربي': 'manufacturerAr',
    'الشركات المصنعة -انجليزي': 'manufacturerEn',
    'رابط الصورة': 'imageUrl'
};

function normalizeString(value) {
    return (value || '').toString().toLowerCase().trim();
}

export function startApp(firebaseFuncs) {
    firebaseAPI = firebaseFuncs;

    // عناصر DOM
    const dataList = document.getElementById('data-list');
    const statusMessage = document.getElementById('status-message');
    const importButton = document.getElementById('import-button');
    const fileInput = document.getElementById('excel-file-input');

    // حقول التصفية
    window.filterSerial = document.getElementById('filter-serial');
    window.filterSector = document.getElementById('filter-sector');
    window.filterProducts = document.getElementById('filter-products');
    window.filterManufacturerAr = document.getElementById('filter-manufacturer-ar');
    window.filterManufacturerEn = document.getElementById('filter-manufacturer-en');

    // ربط زر الاستيراد
    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImport);

    // الاشتراك في التحديثات من Firebase
    if (firebaseAPI && firebaseAPI.subscribeToCollection) {
        firebaseAPI.subscribeToCollection((items) => {
            allTrademarks = items;
            populateSectorDropdown();
            filterData(); // تحديث العرض
            statusMessage.textContent = items.length === 0 ? 'لا توجد بيانات لعرضها.' : `تم عرض ${items.length} سجل.`;
        }, (err) => {
            statusMessage.textContent = 'خطأ في الاتصال بالبيانات في الوقت الفعلي.';
            statusMessage.classList.replace('text-gray-600', 'text-red-500');
        });
    } else {
        statusMessage.textContent = 'Firebase API غير متاحة.';
    }
}

/* ملء القائمة المنسدلة بالمجالات */
function populateSectorDropdown() {
    const sectors = new Set();
    allTrademarks.forEach(item => {
        if (item.sector && item.sector.trim()) sectors.add(item.sector.trim());
    });
    const filterSector = window.filterSector;
    filterSector.innerHTML = '<option value="">-- كل المجالات --</option>';
    const sorted = Array.from(sectors).sort((a,b) => a.localeCompare(b, 'ar'));
    sorted.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        filterSector.appendChild(opt);
    });
}

/* التصفية (متاحة عالمياً للاستخدام في الـ oninput inline) */
window.filterData = function() {
    const serialTerm = normalizeString(window.filterSerial.value);
    const sectorTerm = normalizeString(window.filterSector.value);
    const productsTerm = normalizeString(window.filterProducts.value);
    const manufacturerArTerm = normalizeString(window.filterManufacturerAr.value);
    const manufacturerEnTerm = normalizeString(window.filterManufacturerEn.value);

    const filtered = allTrademarks.filter(item => {
        const serialItem = normalizeString(item.serialNumber);
        const sectorItem = normalizeString(item.sector);
        const productsItem = normalizeString(item.products);
        const manufacturerArItem = normalizeString(item.manufacturerAr);
        const manufacturerEnItem = normalizeString(item.manufacturerEn);

        const serialMatch = !serialTerm || serialItem.includes(serialTerm);
        const sectorMatch = !sectorTerm || sectorItem === sectorTerm;
        const productsMatch = !productsTerm || productsItem.includes(productsTerm);
        const manufacturerArMatch = !manufacturerArTerm || manufacturerArItem.includes(manufacturerArTerm);
        const manufacturerEnMatch = !manufacturerEnTerm || manufacturerEnItem.includes(manufacturerEnTerm);

        return serialMatch && sectorMatch && productsMatch && manufacturerArMatch && manufacturerEnMatch;
    });

    const statusMessage = document.getElementById('status-message');
    if (filtered.length !== allTrademarks.length) {
        statusMessage.textContent = `تم تصفية ${filtered.length} من أصل ${allTrademarks.length} سجل.`;
    } else {
        statusMessage.textContent = `تم عرض ${allTrademarks.length} سجل.`;
    }

    renderTrademarks(filtered);
}

/* عرض البطاقات */
function renderTrademarks(data) {
    const dataList = document.getElementById('data-list');
    dataList.innerHTML = '';
    if (data.length === 0) {
        dataList.innerHTML = `
            <div class="text-center p-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl mt-4">
                <p class="font-bold text-lg mb-2">لا يوجد نتائج مطابقة</p>
                <p>حاول تعديل شروط التصفية أو استيراد المزيد من البيانات.</p>
            </div>
        `;
        return;
    }

    data.forEach(item => {
        const imageUrl = item.imageUrl || 'https://placehold.co/100x100/94a3b8/ffffff?text=بيانات';
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-xl p-4 shadow-lg flex items-start space-x-4 space-x-reverse transition duration-200 hover:shadow-xl cursor-pointer card';
        card.innerHTML = `
            <div class="flex-shrink-0">
                <img src="${imageUrl}" alt="صورة المجال" onerror="this.onerror=null;this.src='https://placehold.co/100x100/94a3b8/ffffff?text=بيانات';" class="w-16 h-16 object-cover rounded-lg border border-gray-200">
            </div>
            <div class="flex-grow text-right">
                <h3 class="text-xl font-extrabold text-blue-800">${item.manufacturerAr || 'غير محدد'}</h3>
                <p class="text-sm text-gray-600 mb-1"><span class="font-semibold">المجال:</span> ${item.sector || 'لا يوجد'}</p>
                <p class="text-sm text-gray-600 mb-1"><span class="font-semibold">الشركة (En):</span> ${item.manufacturerEn || 'N/A'}</p>
                <div class="flex flex-wrap text-xs text-gray-500 mt-2 gap-2">
                    <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">م: #${item.serialNumber || '000'}</span>
                    <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">المنتجات: ${item.products || 'غير مدخل'}</span>
                </div>
            </div>
        `;
        dataList.appendChild(card);
    });
}

/* ------------------ استيراد CSV ------------------ */

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    const firstLine = lines[0];
    let delimiter = firstLine.includes(',') ? ',' : (firstLine.includes(';') ? ';' : '\t');
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g,''));
    const results = [];
    for (let i=1;i<lines.length;i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(delimiter).map(v=>v.trim().replace(/"/g,''));
        const obj = {};
        headers.forEach((header,index) => {
            const dbKey = headerMap[header];
            if (dbKey && values[index] && values[index].trim() !== '') {
                obj[dbKey] = values[index];
            }
        });
        if (Object.keys(obj).length > 0) results.push(obj);
    }
    return results;
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = 'جاري قراءة الملف...';
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const csvText = ev.target.result;
        const records = parseCSV(csvText);
        if (records.length === 0) {
            statusMessage.textContent = 'الملف فارغ أو لا يمكن قراءته. تأكد من أنه ملف CSV صالح.';
            statusMessage.classList.replace('text-gray-600', 'text-red-500');
            return;
        }
        statusMessage.textContent = `تم قراءة ${records.length} سجل. جاري الحفظ...`;
        if (firebaseAPI && firebaseAPI.addRecordsToCollection) {
            const res = await firebaseAPI.addRecordsToCollection(records);
            statusMessage.textContent = `اكتمل الاستيراد! تم حفظ ${res.success} سجل بنجاح. (${res.fail} فشل).`;
        } else {
            statusMessage.textContent = 'Firebase غير مُهيأ. لا يمكن حفظ السجلات.';
        }
        e.target.value = '';
    };
    reader.onerror = () => {
        statusMessage.textContent = 'خطأ أثناء قراءة الملف.';
        statusMessage.classList.replace('text-gray-600', 'text-red-500');
    };
    reader.readAsText(file, 'UTF-8');
}

// تصدير دالة handleImport ليست ضرورية لكن مفيدة للاختبار
export { handleImport };
