// --- 1. INISIALISASI FIREBASE (VERSI BERSIH) ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";

// GANTI isi di bawah ini dengan hasil copy dari Project Settings Firebase-mu!
const firebaseConfig = {
  apiKey: "AIzaSyDekKzviWdLt6Eete-mtVCqRsTzxxr3n1M",
  authDomain: "torasensei-sswkaigo-test.firebaseapp.com",
  projectId: "torasensei-sswkaigo-test",
  storageBucket: "torasensei-sswkaigo-test.firebasestorage.app",
  messagingSenderId: "292842885057",
  appId: "1:292842885057:web:6950479e892d6397852940"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. FUNGSI LOGIN DENGAN DETEKTOR ERROR ---
const handleStudentLogin = async (e) => {
  e.preventDefault();
  setLoginError('');
  if(!studentName.trim() || !studentClass.trim()) return setLoginError("Nama & Kelas wajib diisi!");
  
  setIsLoading(true);
  try {
    // Mencoba mengetuk pintu database
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "student"));
    
    // Jika bagian ini stuck, berarti apiKey atau projectId salah
    const querySnapshot = await getDocs(q);
    const allStudents = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const found = allStudents.find(u => 
      u.name?.toLowerCase() === studentName.trim().toLowerCase() && 
      (u.className?.toLowerCase() === studentClass.trim().toLowerCase() || u.classname?.toLowerCase() === studentClass.trim().toLowerCase())
    );

    let user = found;
    if (!user) {
      // Jika tidak ada, buat baru
      const newUserRef = doc(collection(db, "users"));
      user = { 
        id: newUserRef.id, 
        role: 'student', 
        name: studentName.trim(), 
        className: studentClass.trim(), 
        xp: 100, 
        streak: 1 
      };
      await setDoc(newUserRef, user);
    }
    setCurrentUser(user);
    setCurrentView('student_dash');
  } catch (err) {
    // Jika gagal, tampilkan pesan error aslinya di layar
    console.error(err);
    setLoginError("KONEKSI GAGAL: " + err.code); 
  }
  setIsLoading(false);
};
