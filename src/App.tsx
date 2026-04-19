import React, { useState, useEffect } from 'react';
import { Flame, Star, Zap, Shield, Target, Clock, ArrowRight, ArrowLeft, Send, LogOut, ChevronRight, User, Key, Award, BookOpen, AlertCircle, X, Download, Users, Lock } from 'lucide-react';

// --- FIREBASE INTEGRATION ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, onSnapshot, query, where } from "firebase/firestore";

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

// --- MOCK DATA SEMENTARA ---
const MOCK_PACKAGES = [
  { id: 11, number: 11, title: 'Paket Uji Coba Kaigo', total: 1, duration: 10, passScore: 60 }
];
const getQuestionsForPackage = (pkgId) => {
  return [
    { id: 'q1', type: 'multiple_choice', text_html: 'Apa bahasa Jepangnya "Terima kasih"?', options: [{id:'o1', label:'A', text_html:'Arigatou', is_correct:true}, {id:'o2', label:'B', text_html:'Sayounara', is_correct:false}] }
  ];
};
const checkFreewritingAnswer = (userAns, acceptedAnswers) => false;

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [users, setUsers] = useState([]);
  const [progress, setProgress] = useState({}); 
  const [attempts, setAttempts] = useState([]); 
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); 
  const [currentAttempt, setCurrentAttempt] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginTab, setLoginTab] = useState('student');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState(''); 

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
      const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => setUsers(snapshot.docs.map(d => d.data())));
      const unsubAttempts = onSnapshot(collection(db, "attempts"), (snapshot) => setAttempts(snapshot.docs.map(d => d.data())));
      return () => { unsubUsers(); unsubAttempts(); };
    } else if (currentUser.role === 'student') {
      const q = query(collection(db, "attempts"), where("userId", "==", currentUser.id));
      const unsubAttempts = onSnapshot(q, (snapshot) => {
        const studentAttempts = snapshot.docs.map(d => d.data());
        setAttempts(studentAttempts);
        const newProgress = {};
        MOCK_PACKAGES.forEach(p => { newProgress[p.id] = { status: 'available', bestScore: 0 }; });
        studentAttempts.forEach(att => {
          if (att.status === 'submitted') {
            if (att.score > (newProgress[att.pkgId].bestScore || 0)) newProgress[att.pkgId].bestScore = att.score;
            newProgress[att.pkgId].status = (att.passed || newProgress[att.pkgId].status === 'passed') ? 'passed' : 'remedial';
          }
        });
        setProgress({ [currentUser.id]: newProgress });
      });
      return () => unsubAttempts();
    }
  }, [currentUser]);

  // JURUS ANTI NYANGKUT!
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if(!studentName.trim() || !studentClass.trim()) { setLoginError("Nama dan Kelas wajib diisi!"); return; }
    
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "student"));
      const querySnapshot = await getDocs(q);

      const foundUser = querySnapshot.docs.map(d => d.data()).find(u => u.name.toLowerCase() === studentName.trim().toLowerCase() && u.className.toLowerCase() === studentClass.trim().toLowerCase());

      let user = foundUser;
      if (!user) {
        const newUserRef = doc(collection(db, "users"));
        user = { id: newUserRef.id, role: 'student', name: studentName.trim(), className: studentClass.trim(), xp: 100, streak: 1, createdAt: Date.now() };
        await setDoc(newUserRef, user);
      }
      setCurrentUser(user);
      setCurrentView('student_dash');
    } catch (err) {
      setLoginError("Gagal terhubung ke database!");
    }
    setIsLoading(false);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if(adminUser === 'admin' && adminPass === 'admin123') { 
      setCurrentUser({ id: 'admin_1', role: 'admin', name: 'Tora Sensei Admin' });
      setCurrentView('admin_dash');
    } else { setLoginError("Username atau password salah."); }
  };

  const handleLogout = () => { setCurrentUser(null); setCurrentView('login'); setStudentName(''); setStudentClass(''); };

  const startExam = (pkgId) => {
    setCurrentAttempt({ id: `att_${Date.now()}`, userId: currentUser.id, pkgId: pkgId, status: 'in_progress', answers: {}, startedAt: Date.now(), score: 0, isTimeout: false });
    setCurrentView('exam');
  };

  const submitExam = async (forcedTimeout) => {
    const currentQuestions = getQuestionsForPackage(currentAttempt.pkgId);
    let correct = 0;
    currentQuestions.forEach(q => {
      const correctOpt = q.options.find(o => o.is_correct);
      if(correctOpt && currentAttempt.answers[q.id] === correctOpt.id) correct++;
    });
    const score = (correct / currentQuestions.length) * 100;
    const finalAttempt = { ...currentAttempt, status: 'submitted', score, passed: score >= 60, submittedAt: Date.now(), correctCount: correct, isTimeout: forcedTimeout };
    setCurrentAttempt(finalAttempt);
    setCurrentView('result');
    try {
      await setDoc(doc(db, "attempts", finalAttempt.id), finalAttempt);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen font-sans text-[#4B4B4B] bg-[#F7F7F7] flex justify-center">
      <div className={`w-full bg-white min-h-screen relative flex flex-col shadow-2xl max-w-md`}>
        {currentView === 'login' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
            <div className="mb-8 flex flex-col items-center"><h1 className="text-4xl font-black text-[#4B4B4B]">TORA先生</h1><p className="text-[#AFAFAF] font-bold mt-2">Belajar asyik, ga pake pusing.</p></div>
            <div className="w-full max-w-sm">
              <div className="flex bg-[#F7F7F7] p-1 rounded-2xl mb-6">
                <button className={`flex-1 py-3 font-extrabold text-sm rounded-xl ${loginTab === 'student' ? 'bg-white text-[#1CB0F6] shadow-sm' : 'text-[#AFAFAF]'}`} onClick={() => setLoginTab('student')}>MURID</button>
                <button className={`flex-1 py-3 font-extrabold text-sm rounded-xl ${loginTab === 'admin' ? 'bg-white text-[#FF4B4B] shadow-sm' : 'text-[#AFAFAF]'}`} onClick={() => setLoginTab('admin')}>SENSEI</button>
              </div>
              {loginError && <div className="mb-4 text-[#FF4B4B] font-bold text-sm">{loginError}</div>}
              {loginTab === 'student' ? (
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] font-bold" placeholder="Nama Panggilan" value={studentName} onChange={e => setStudentName(e.target.value)} />
                  <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] font-bold" placeholder="Kelas (Misal: N4)" value={studentClass} onChange={e => setStudentClass(e.target.value)} />
                  <button disabled={isLoading} type="submit" className="w-full py-4 rounded-2xl font-extrabold text-white bg-[#58CC02]">{isLoading ? 'LOADING...' : 'MULAI GAS!'}</button>
                </form>
              ) : (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] font-bold" placeholder="Username Admin" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
                  <input type="password" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] font-bold" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                  <button type="submit" className="w-full py-4 rounded-2xl font-extrabold text-white bg-[#FF4B4B]">MASUK DASHBOARD</button>
                </form>
              )}
            </div>
          </div>
        )}
        
        {currentView === 'student_dash' && (
          <div className="p-6">
            <h2 className="text-2xl font-black mb-4">Pilih Misimu, {currentUser?.name}!</h2>
            {MOCK_PACKAGES.map(pkg => (
              <button key={pkg.id} onClick={() => startExam(pkg.id)} className="w-full py-4 mb-4 bg-[#1CB0F6] text-white font-extrabold rounded-2xl">{pkg.title}</button>
            ))}
            <button onClick={handleLogout} className="mt-8 text-red-500 font-bold">Keluar</button>
          </div>
        )}

        {currentView === 'exam' && (
          <div className="p-6">
             <h2 className="font-black text-xl mb-4">Ujian Dimulai!</h2>
             {getQuestionsForPackage(currentAttempt?.pkgId).map(q => (
               <div key={q.id} className="mb-4">
                 <p className="font-bold mb-2" dangerouslySetInnerHTML={{__html: q.text_html}}></p>
                 {q.options.map(opt => (
                   <button key={opt.id} onClick={() => setCurrentAttempt(prev => ({...prev, answers: {[q.id]: opt.id}}))} className={`block w-full p-3 mb-2 rounded-xl text-left font-bold ${currentAttempt.answers[q.id] === opt.id ? 'bg-[#DDF4FF] text-[#1CB0F6]' : 'bg-[#F7F7F7]'}`}>{opt.text_html}</button>
                 ))}
               </div>
             ))}
             <button onClick={() => submitExam(false)} className="w-full py-4 mt-4 bg-[#58CC02] text-white font-extrabold rounded-2xl">KIRIM JAWABAN</button>
          </div>
        )}

        {currentView === 'result' && (
          <div className="p-6 text-center">
            <h1 className="text-4xl font-black mb-4">{currentAttempt?.passed ? 'LULUS!' : 'REMEDIAL!'}</h1>
            <p className="text-2xl font-bold mb-8">Skor: {Math.round(currentAttempt?.score)}</p>
            <button onClick={() => setCurrentView('student_dash')} className="w-full py-4 bg-[#1CB0F6] text-white font-extrabold rounded-2xl">KEMBALI</button>
          </div>
        )}

        {currentView === 'admin_dash' && (
          <div className="p-6">
            <h2 className="text-2xl font-black mb-4">Dashboard Sensei</h2>
            <p className="mb-4 font-bold">Total Murid: {users.filter(u => u.role === 'student').length}</p>
            {attempts.filter(a => a.status === 'submitted').map(att => (
               <div key={att.id} className="p-4 bg-[#F7F7F7] mb-2 rounded-xl font-bold">
                 {users.find(u => u.id === att.userId)?.name} - Skor: {Math.round(att.score)}
               </div>
            ))}
            <button onClick={handleLogout} className="mt-8 text-red-500 font-bold">Keluar</button>
          </div>
        )}
      </div>
    </div>
  );
}
