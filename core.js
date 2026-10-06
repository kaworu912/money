// ====== core.js ======

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

const categories = {
    "餐飲": ["早餐", "午餐", "晚餐", "飲料", "零食", "買菜"],
    "交通": ["捷運", "公車", "計程車", "加油", "停車費", "保養"],
    "居家": ["日用品", "水電瓦斯", "房租/房貸", "電信費"],
    "娛樂": ["電影", "訂閱費", "出遊", "網購", "麻將"],
    "其他": ["自訂..."] 
};

// ⭐ 從手機記憶體讀取曾經輸入過的自訂項目，並自動加入選單
let savedOthers = JSON.parse(localStorage.getItem("customOthers") || "[]");
savedOthers.forEach(item => {
    if (!categories["其他"].includes(item)) {
        categories["其他"].push(item);
    }
});

let currentNickname = ""; 
let unsubscribe = null;

function initCategories() {
    const mainSelect = document.getElementById("main-category");
    mainSelect.innerHTML = "";
    for (let main in categories) {
        mainSelect.innerHTML += `<option value="${main}">${main}</option>`;
    }
    updateSubCategories();
}

function updateSubCategories() {
    const mainValue = document.getElementById("main-category").value;
    const subSelect = document.getElementById("sub-category");
    subSelect.innerHTML = "";
    categories[mainValue].forEach(sub => {
        subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
}

function convertToFakeEmail(accountText) {
    let hex = '';
    for (let i = 0; i < accountText.length; i++) {
        hex += accountText.charCodeAt(i).toString(16);
    }
    return hex + "@myapp.fake";
}

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app-screen").classList.remove("hidden");
        
        currentNickname = localStorage.getItem("myNickname") || "User";
        document.getElementById("greeting").innerText = `Hello, ${currentNickname}`;
        
        if(typeof loadExpenses === 'function') loadExpenses(user.uid); 
    } else {
        document.getElementById("login-screen").classList.remove("hidden");
        document.getElementById("app-screen").classList.add("hidden");
        if (unsubscribe) unsubscribe();
    }
});

function register() {
    const accountStr = document.getElementById("account").value.trim();
    const password = document.getElementById("password").value;
    const nickname = document.getElementById("nickname").value.trim();

    if (!accountStr || !password || !nickname) return alert("帳號、密碼和暱稱都不能空白喔！");
    if (password.length < 6) return alert("Firebase 規定密碼至少要 6 個字元！");

    localStorage.setItem("myNickname", nickname);
    const fakeEmail = convertToFakeEmail(accountStr);

    auth.createUserWithEmailAndPassword(fakeEmail, password)
        .then(() => alert("註冊成功！"))
        .catch(error => alert("註冊失敗：帳號可能已經存在，或請檢查網路連線。"));
}

function login() {
    const accountStr = document.getElementById("account").value.trim();
    const password = document.getElementById("password").value;
    const nickname = document.getElementById("nickname").value.trim();

    if (!accountStr || !password || !nickname) return alert("帳號、密碼和暱稱都不能空白喔！");

    localStorage.setItem("myNickname", nickname);
    const fakeEmail = convertToFakeEmail(accountStr);

    auth.signInWithEmailAndPassword(fakeEmail, password)
        .catch(error => alert("登入失敗：請檢查帳號或密碼是否正確。"));
}

function logout() {
    auth.signOut();
}

function formatAmountInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value !== '') {
        input.value = Number(value).toLocaleString('en-US');
    } else {
        input.value = '';
    }
}

initCategories();