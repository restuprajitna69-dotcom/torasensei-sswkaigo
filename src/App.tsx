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
// ----------------------------

// ==========================================
// TARUH DATA SOAL MOCK_PACKAGES & PACKAGE_QUESTIONS KAMU DI SINI
// (Di bawah ini Sensei buatkan contoh kerangka kosongnya agar aplikasinya tidak error)
// ==========================================
const MOCK_PACKAGES = [
  { id: 11, number: 11, title: 'Paket 11 (Kosakata - Campuran 1)', total: 50, duration: 40, passScore: 60 },
  { id: 12, number: 12, title: 'Paket 12 (Evaluasi Kaigo Bhs. Indonesia 2)', total: 30, duration: 30, passScore: 60 }
];

const getQuestionsForPackage = (pkgId) => {
  // Masukkan logika return paket soalmu di sini
  // if (pkgId === 11) return PACKAGE_11_QUESTIONS;
  return []; 
};

const checkFreewritingAnswer = (userAns, acceptedAnswers) => {
  if (!userAns) return false;
  const u = userAns.toLowerCase().trim();
  return acceptedAnswers.some(ans => {
    const a = ans.toLowerCase().trim();
    return u === a || u.includes(a) || (a.includes(u) && u.length >= 4);
  });
};
// ==========================================

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  // Global States (Synced with Firebase)
  const [users, setUsers] = useState([]);
  const [progress, setProgress] = useState({}); 
  const [attempts, setAttempts] = useState([]); 
  
  // App Session States
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); 
  const [currentAttempt, setCurrentAttempt] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Login Form States
  const [loginTab, setLoginTab] = useState('student');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState(''); 

  // --- FIREBASE REALTIME LISTENERS ---
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
      const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        setUsers(snapshot.docs.map(d => d.data()));
      });
      const unsubAttempts = onSnapshot(collection(db, "attempts"), (snapshot) => {
        setAttempts(snapshot.docs.map(d => d.data()));
      });
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
            const currentBest = newProgress[att.pkgId].bestScore || 0;
            if (att.score > currentBest) newProgress[att.pkgId].bestScore = att.score;
            if (att.passed || newProgress[att.pkgId].status === 'passed') {
              newProgress[att.pkgId].status = 'passed';
            } else {
              newProgress[att.pkgId].status = 'remedial';
            }
          }
        });
        setProgress({ [currentUser.id]: newProgress });

        const userQ = query(collection(db, "users"), where("id", "==", currentUser.id));
        getDocs(userQ).then(res => {
          if(!res.empty) setCurrentUser(res.docs[0].data());
        });
      });
      return () => unsubAttempts();
    }
  }, [currentUser]);

  // --- ACTIONS ---
const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if(!studentName.trim() || !studentClass.trim()) {
      setLoginError("Nama dan Kelas wajib diisi ya!");
      return;
    }
    
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      // Hanya panggil peran murid (Tidak bikin Firebase pusing)
      const q = query(usersRef, where("role", "==", "student"));
      const querySnapshot = await getDocs(q);

      // Kita cari namanya secara manual di aplikasi
      const foundUser = querySnapshot.docs
        .map(d => d.data())
        .find(u => u.name.toLowerCase() === studentName.trim().toLowerCase() && u.className.toLowerCase() === studentClass.trim().toLowerCase());

      let user;
      if (foundUser) {
        user = foundUser;
      } else {
        // Jika belum ada, buatkan data baru!
        const newUserRef = doc(collection(db, "users"));
        user = { 
          id: newUserRef.id, 
          role: 'student', 
          name: studentName.trim(), 
          className: studentClass.trim(),
          xp: Math.floor(Math.random() * 200) + 50, 
          streak: Math.floor(Math.random() * 3) + 1,
          createdAt: Date.now()
        };
        await setDoc(newUserRef, user);
      }
      
      setCurrentUser(user);
      setCurrentView('student_dash');
    } catch (err) {
      setLoginError("Ups, gagal terhubung! Cek sinyal internetmu ya.");
    }
    setIsLoading(false);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if(adminUser === 'admin' && adminPass === 'admin123') { 
      setCurrentUser({ id: 'admin_1', role: 'admin', name: 'Tora Sensei Admin' });
      setCurrentView('admin_dash');
    } else {
      setLoginError("Ups! Username atau password admin salah.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setStudentName('');
    setStudentClass('');
    setAdminUser('');
    setAdminPass('');
  };

  const startExam = (pkgId) => {
    setCurrentAttempt({
      id: `att_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      userId: currentUser.id,
      pkgId: pkgId,
      status: 'in_progress',
      answers: {}, 
      startedAt: Date.now(),
      score: 0,
      isTimeout: false
    });
    setCurrentView('exam');
  };

  const abortExam = () => {
    setCurrentAttempt(null);
    setCurrentView('student_dash');
  };

  const submitExam = async (forcedTimeout) => {
    const currentQuestions = getQuestionsForPackage(currentAttempt.pkgId);
    let correct = 0;
    
    currentQuestions.forEach(q => {
      if (q.type === 'freewriting') {
        if (checkFreewritingAnswer(currentAttempt.answers[q.id], q.accepted_answers)) correct++;
      } else {
        const correctOpt = q.options.find(o => o.is_correct);
        if(correctOpt && currentAttempt.answers[q.id] === correctOpt.id) correct++;
      }
    });

    const score = (correct / currentQuestions.length) * 100;
    const passed = score >= 60;

    const finalAttempt = {
      ...currentAttempt,
      status: 'submitted',
      score: score,
      passed: passed,
      submittedAt: Date.now(),
      correctCount: correct,
      isTimeout: forcedTimeout
    };

    setCurrentAttempt(finalAttempt);
    setCurrentView('result');

    try {
      await setDoc(doc(db, "attempts", finalAttempt.id), finalAttempt);
      const xpGained = passed ? Math.round(score) : 15;
      await updateDoc(doc(db, "users", currentUser.id), { xp: currentUser.xp + xpGained });
    } catch (err) {
      console.error("Gagal menyimpan ke Cloud:", err);
    }
  };

  // --- RENDERERS ---
  return (
    <div className="min-h-screen font-sans text-[#4B4B4B] bg-[#F7F7F7] flex justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Noto+Sans+JP:wght@500;700;900&display=swap');
        body { font-family: 'Nunito', sans-serif; background-color: #e5e5e5; }
        .japanese-text { font-family: 'Noto Sans JP', sans-serif; line-height: 2; font-size: 1.15rem; font-weight: 700; }
        .japanese-text ruby { ruby-align: center; }
        .japanese-text rt { font-size: 0.6em; color: #AFAFAF; transform: translateY(-0.1em); font-weight: 900; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .btn-3d { transition: transform 0.1s, border-bottom-width 0.1s, margin-top 0.1s; }
        .btn-3d:active:not(:disabled) { transform: translateY(4px); border-bottom-width: 0px !important; margin-top: 4px; }
        .card-3d { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-3d:active:not(.disabled-card) { transform: translateY(4px); border-bottom-width: 2px !important; }
        .path-line { position: absolute; width: 16px; background: #E5E5E5; top: 40px; bottom: 40px; left: 50%; transform: translateX(-50%); z-index: 0; border-radius: 20px; }
      `}</style>

      <div className={`w-full bg-white min-h-screen relative flex flex-col shadow-2xl ${currentUser?.role === 'admin' ? 'max-w-6xl' : 'max-w-md'}`}>
        
        {currentView === 'login' && (
          <LoginView 
            loginTab={loginTab} setLoginTab={setLoginTab}
            studentName={studentName} setStudentName={setStudentName}
            studentClass={studentClass} setStudentClass={setStudentClass}
            handleStudentLogin={handleStudentLogin}
            adminUser={adminUser} setAdminUser={setAdminUser}
            adminPass={adminPass} setAdminPass={setAdminPass}
            handleAdminLogin={handleAdminLogin}
            loginError={loginError} isLoading={isLoading}
          />
        )}

        {currentView === 'student_dash' && (
          <StudentDashboard user={currentUser} progress={progress[currentUser?.id] || {}} packages={MOCK_PACKAGES} onStartExam={startExam} onLogout={handleLogout} />
        )}

        {currentView === 'exam' && (
          <ExamView attempt={currentAttempt} packages={MOCK_PACKAGES} questions={getQuestionsForPackage(currentAttempt?.pkgId)} onSaveAnswer={(qId, optId) => setCurrentAttempt(prev => ({ ...prev, answers: { ...prev.answers, [qId]: optId } }))} onSubmit={submitExam} onAbort={abortExam} />
        )}

        {currentView === 'result' && (
          <ResultView attempt={currentAttempt} packages={MOCK_PACKAGES} questions={getQuestionsForPackage(currentAttempt?.pkgId)} onBackToDash={() => setCurrentView('student_dash')} />
        )}

        {currentView === 'admin_dash' && (
          <AdminDashboard users={users} attempts={attempts} packages={MOCK_PACKAGES} getQuestions={getQuestionsForPackage} onLogout={handleLogout} />
        )}

      </div>
    </div>
  );
}

function LoginView({ loginTab, setLoginTab, studentName, setStudentName, studentClass, setStudentClass, handleStudentLogin, adminUser, setAdminUser, adminPass, setAdminPass, handleAdminLogin, loginError, isLoading }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">
      <div className="absolute top-10 left-10 w-16 h-16 bg-[#58CC02]/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-5 w-24 h-24 bg-[#1CB0F6]/20 rounded-full blur-2xl"></div>
      <div className="mb-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-[#58CC02] border-b-8 border-[#58A700] rounded-[2rem] flex items-center justify-center transform -rotate-3 mb-4 shadow-sm">
          <span className="text-white font-black text-4xl">虎</span>
        </div>
        <h1 className="text-4xl font-black text-[#4B4B4B] tracking-tight">TORA先生</h1>
        <p className="text-[#AFAFAF] font-bold mt-2 text-lg">Belajar asyik, ga pake pusing.</p>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex bg-[#F7F7F7] p-1 rounded-2xl mb-6 border-2 border-[#E5E5E5]">
          <button className={`flex-1 py-3 font-extrabold text-sm rounded-xl transition-all ${loginTab === 'student' ? 'bg-white text-[#1CB0F6] shadow-sm' : 'text-[#AFAFAF]'}`} onClick={() => setLoginTab('student')}>MURID</button>
          <button className={`flex-1 py-3 font-extrabold text-sm rounded-xl transition-all ${loginTab === 'admin' ? 'bg-white text-[#FF4B4B] shadow-sm' : 'text-[#AFAFAF]'}`} onClick={() => setLoginTab('admin')}>SENSEI</button>
        </div>

        {loginError && <div className="mb-4 bg-[#FF4B4B]/10 border-2 border-[#FF4B4B] text-[#FF4B4B] p-4 rounded-2xl font-bold flex items-center text-sm"><AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {loginError}</div>}

        {loginTab === 'student' ? (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] border-2 border-[#E5E5E5] focus:border-[#1CB0F6] focus:bg-white outline-none transition-all font-bold text-lg text-[#4B4B4B] placeholder-[#AFAFAF]" placeholder="Nama Panggilan" value={studentName} onChange={e => setStudentName(e.target.value)} />
            <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] border-2 border-[#E5E5E5] focus:border-[#1CB0F6] focus:bg-white outline-none transition-all font-bold text-lg text-[#4B4B4B] placeholder-[#AFAFAF]" placeholder="Kelas (Misal: N4)" value={studentClass} onChange={e => setStudentClass(e.target.value)} />
            <button disabled={isLoading} type="submit" className={`btn-3d w-full py-4 rounded-2xl font-extrabold text-xl tracking-wide text-white border-b-4 transition-all flex justify-center items-center ${isLoading ? 'bg-gray-300 border-gray-400 cursor-not-allowed' : 'bg-[#58CC02] border-[#58A700] hover:bg-[#4CEB00]'}`}>{isLoading ? 'LOADING...' : 'MULAI GAS!'}</button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input type="text" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] border-2 border-[#E5E5E5] focus:border-[#FF4B4B] focus:bg-white outline-none transition-all font-bold text-lg text-[#4B4B4B] placeholder-[#AFAFAF]" placeholder="Username Admin" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
            <input type="password" required className="w-full px-5 py-4 rounded-2xl bg-[#F7F7F7] border-2 border-[#E5E5E5] focus:border-[#FF4B4B] focus:bg-white outline-none transition-all font-bold text-lg text-[#4B4B4B] placeholder-[#AFAFAF]" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
            <button type="submit" className="btn-3d w-full py-4 rounded-2xl font-extrabold text-xl tracking-wide text-white bg-[#FF4B4B] border-b-4 border-[#EA2B2B] hover:bg-[#FF6666]">MASUK DASHBOARD</button>
          </form>
        )}
      </div>
    </div>
  );
}

function StudentDashboard({ user, progress, packages, onStartExam, onLogout }) {
  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="sticky top-0 bg-white border-b-2 border-[#E5E5E5] z-50 px-5 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="flex items-center text-[#AFAFAF] hover:text-[#4B4B4B] transition-colors"><User className="w-8 h-8 p-1.5 bg-[#F7F7F7] border-2 border-[#E5E5E5] rounded-full" /></button>
          <div className="flex items-center gap-1.5 text-[#FF9600] font-black text-lg"><Flame className="w-6 h-6 fill-current" /> {user.streak}</div>
          <div className="flex items-center gap-1.5 text-[#1CB0F6] font-black text-lg"><Star className="w-6 h-6 fill-current" /> {user.xp}</div>
        </div>
        <div className="text-sm font-extrabold text-[#CECECE] uppercase tracking-wider">TORA先生</div>
      </div>
      <div className="px-5 py-6">
        <h2 className="text-2xl font-black text-[#4B4B4B] mb-2 text-center">Pilih Misimu, {user.name}!</h2>
        <div className="flex flex-col items-center space-y-8 relative py-4">
          <div className="path-line"></div>
          {packages.map((pkg, index) => {
            const stat = progress[pkg.id]?.status || 'available';
            const isPassed = stat === 'passed';
            const isRemedial = stat === 'remedial';
            let btnBg = 'bg-[#1CB0F6]', btnBorder = 'border-[#1899D6]', icon = <BookOpen className="w-8 h-8 text-white fill-current" />;
            if (isPassed) { btnBg = 'bg-[#FFC800]'; btnBorder = 'border-[#D8A800]'; icon = <Award className="w-10 h-10 text-white fill-current" />; } 
            else if (isRemedial) { btnBg = 'bg-[#FF4B4B]'; btnBorder = 'border-[#EA2B2B]'; icon = <AlertCircle className="w-8 h-8 text-white fill-current" />; }
            const isLeft = index % 2 === 0;
            return (
              <div key={pkg.id} className="relative z-10 w-full flex justify-center group cursor-pointer" onClick={() => onStartExam(pkg.id)}>
                <div className={`absolute top-0 w-44 bg-white border-2 border-[#E5E5E5] p-3 rounded-2xl shadow-sm text-center transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 pointer-events-none ${isLeft ? 'right-[55%]' : 'left-[55%]'}`}>
                  <div className="font-extrabold text-[#4B4B4B] text-sm leading-tight">{pkg.title}</div>
                  <div className="text-[#AFAFAF] font-bold text-xs mt-1">{pkg.total} Soal</div>
                  <div className={`absolute top-1/2 -mt-2 w-4 h-4 bg-white border-b-2 border-r-2 border-[#E5E5E5] transform rotate-135 ${isLeft ? '-right-2' : '-left-2 rotate-[-45deg]'}`}></div>
                </div>
                <button className={`btn-3d w-24 h-24 rounded-full border-b-[6px] flex items-center justify-center shadow-sm ${btnBg} ${btnBorder} hover:brightness-110`}>{icon}</button>
                <div className="absolute top-[100px] bg-white border-2 border-[#E5E5E5] px-3 py-1 rounded-xl shadow-sm z-20 md:hidden"><p className="font-bold text-[#4B4B4B] text-xs max-w-[120px] truncate text-center">{pkg.title}</p></div>
              </div>
            );
          })}
          <div className="w-16 h-16 bg-[#E5E5E5] rounded-full border-4 border-white z-10 flex items-center justify-center mt-12 shadow-sm"><Lock className="w-6 h-6 text-white fill-current" /></div>
        </div>
      </div>
    </div>
  );
}

function ExamView({ attempt, packages, questions, onSaveAnswer, onSubmit, onAbort }) {
  const pkg = packages.find(p => p.id === attempt.pkgId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(pkg.duration * 60); 
  const currentQ = questions[currentIndex];

  useEffect(() => {
    if(!pkg || !attempt) return;
    const timer = setInterval(() => {
      const remaining = (pkg.duration * 60) - Math.floor((Date.now() - attempt.startedAt) / 1000);
      if (remaining <= 0) { clearInterval(timer); onSubmit(true); } 
      else { setTimeLeft(remaining); }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt, pkg, onSubmit]);

  if (!currentQ) return <div className="p-10 text-center font-bold">Data soal kosong, pastikan MOCK_PACKAGES terisi!</div>;

  return (
    <div className="flex-1 flex flex-col bg-white h-screen overflow-hidden relative">
      <div className="pt-6 pb-4 px-4 flex items-center gap-4 bg-white z-20 shadow-sm">
        <button onClick={onAbort} className="text-[#AFAFAF] hover:text-[#4B4B4B] transition-colors"><X className="w-8 h-8" /></button>
        <div className="flex-1 h-4 bg-[#E5E5E5] rounded-full overflow-hidden relative">
          <div className="h-full bg-[#58CC02] rounded-full transition-all duration-500 relative" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}><div className="absolute top-1 left-2 right-2 h-1 bg-white/30 rounded-full"></div></div>
        </div>
        <div className={`font-black text-lg flex items-center ${timeLeft < 300 ? 'text-[#FF4B4B] animate-pulse' : 'text-[#AFAFAF]'}`}>{Math.floor(timeLeft / 60)}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 custom-scrollbar flex flex-col items-center">
        <div className="w-full max-w-lg mt-4">
          <h2 className="font-extrabold text-2xl text-[#4B4B4B] mb-6">Pilih jawaban yang benar!</h2>
          <div className="mb-8 text-[#4B4B4B]"><div className="japanese-text" dangerouslySetInnerHTML={{ __html: currentQ.text_html }} /></div>
          {currentQ.type === 'freewriting' ? (
            <textarea value={attempt.answers[currentQ.id] || ''} onChange={(e) => onSaveAnswer(currentQ.id, e.target.value)} placeholder="Ketik jawabanmu..." className="w-full p-5 rounded-2xl bg-[#F7F7F7] border-2 border-[#E5E5E5] focus:border-[#1CB0F6] outline-none font-bold text-xl resize-none shadow-inner" rows="3"></textarea>
          ) : (
            <div className="space-y-3 w-full">
              {currentQ.options.map((opt) => (
                <button key={opt.id} onClick={() => onSaveAnswer(currentQ.id, opt.id)} className={`card-3d w-full text-left p-4 rounded-2xl border-2 flex items-center transition-colors ${attempt.answers[currentQ.id] === opt.id ? 'border-[#1CB0F6] bg-[#DDF4FF] border-b-4' : 'border-[#E5E5E5] bg-white border-b-4 hover:bg-[#F7F7F7]'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black mr-4 shrink-0 border-2 ${attempt.answers[currentQ.id] === opt.id ? 'border-[#1CB0F6] bg-white text-[#1CB0F6]' : 'border-[#E5E5E5] text-[#AFAFAF] bg-white'}`}>{opt.label}</div>
                  <div className={`japanese-text flex-1 ${attempt.answers[currentQ.id] === opt.id ? 'text-[#1CB0F6]' : 'text-[#4B4B4B]'}`} dangerouslySetInnerHTML={{ __html: opt.text_html }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t-2 border-[#E5E5E5] bg-white p-5 pb-8 flex justify-between items-center z-30">
        <div className="max-w-lg w-full mx-auto flex gap-4">
          <button onClick={() => setCurrentIndex(prev => prev - 1)} disabled={currentIndex === 0} className={`btn-3d py-4 px-6 rounded-2xl font-extrabold uppercase transition-all border-b-4 flex-shrink-0 ${currentIndex === 0 ? 'bg-[#E5E5E5] border-[#CECECE] text-[#AFAFAF] cursor-not-allowed opacity-50' : 'bg-white border-[#E5E5E5] border-2 text-[#AFAFAF] hover:bg-[#F7F7F7]'}`}>MUNDUR</button>
          {currentIndex === questions.length - 1 ? (
            <button onClick={() => onSubmit(false)} className="btn-3d flex-1 py-4 rounded-2xl font-extrabold uppercase text-white bg-[#58CC02] border-b-4 border-[#58A700] hover:bg-[#4CEB00]">KIRIM JAWABAN</button>
          ) : (
            <button onClick={() => setCurrentIndex(prev => prev + 1)} className={`btn-3d flex-1 py-4 rounded-2xl font-extrabold uppercase transition-all border-b-4 ${(attempt.answers[currentQ.id] !== undefined && attempt.answers[currentQ.id] !== '') ? 'bg-[#58CC02] border-[#58A700] text-white hover:bg-[#4CEB00]' : 'bg-[#E5E5E5] border-[#CECECE] text-[#AFAFAF]'}`}>LANJUT</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ attempt, packages, questions, onBackToDash }) {
  const pkg = packages.find(p => p.id === attempt.pkgId);
  return (
    <div className="flex-1 flex flex-col bg-white h-screen overflow-hidden">
      <div className={`p-8 pb-12 flex flex-col items-center justify-center text-white relative z-10 ${attempt.passed ? 'bg-[#FFC800]' : 'bg-[#FF4B4B]'}`}>
        <h1 className="text-3xl font-black mb-2 uppercase drop-shadow-md text-center">{attempt.passed ? 'Misi Selesai!' : 'Coba Lagi!'}</h1>
        <div className="w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-lg border-b-8 border-[#E5E5E5] mb-4"><span className="text-6xl font-black" style={{ color: attempt.passed ? '#FFC800' : '#FF4B4B' }}>{Math.round(attempt.score)}</span></div>
        <div className="flex gap-4 font-black text-lg"><div className="bg-white/20 px-4 py-2 rounded-xl">👍 {attempt.correctCount}</div><div className="bg-white/20 px-4 py-2 rounded-xl">👎 {questions.length - attempt.correctCount}</div></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-8">
        <div className="space-y-6 max-w-lg mx-auto">
          {questions.map((q, i) => {
            const isFree = q.type === 'freewriting';
            const isCorrect = isFree ? checkFreewritingAnswer(attempt.answers[q.id], q.accepted_answers) : (q.options.find(o => o.is_correct)?.id === attempt.answers[q.id]);
            return (
              <div key={q.id} className="bg-white rounded-2xl border-2 border-[#E5E5E5] p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b-2 border-[#F7F7F7] pb-3"><span className={`text-sm font-black px-3 py-1 rounded-xl uppercase ${isCorrect ? 'bg-[#58CC02]/10 text-[#58CC02]' : 'bg-[#FF4B4B]/10 text-[#FF4B4B]'}`}>{isCorrect ? 'BENAR' : 'SALAH'}</span><span className="text-[#AFAFAF] font-black">Soal {i+1}</span></div>
                <div className="japanese-text text-[#4B4B4B] mb-4" dangerouslySetInnerHTML={{ __html: q.text_html }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t-2 border-[#E5E5E5] bg-white p-5 pb-8 z-30">
        <button onClick={onBackToDash} className="btn-3d w-full max-w-lg mx-auto py-4 rounded-2xl font-extrabold uppercase text-white bg-[#1CB0F6] border-b-4 border-[#1899D6] hover:bg-[#1483B8] block">LANJUTKAN</button>
      </div>
    </div>
  );
}

function AdminDashboard({ users, attempts, packages, getQuestions, onLogout }) {
  const students = users.filter(u => u.role === 'student');
  const subs = attempts.filter(a => a.status === 'submitted');
  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F7] min-h-screen">
      <div className="bg-white border-b-2 border-[#E5E5E5] px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center"><div className="w-12 h-12 bg-[#FF4B4B] rounded-2xl border-b-4 border-[#EA2B2B] flex items-center justify-center mr-4"><span className="text-white font-black text-xl">虎</span></div><div><h1 className="font-black text-2xl text-[#4B4B4B] leading-none">Ruang Sensei</h1></div></div>
        <button onClick={onLogout} className="btn-3d px-5 py-3 rounded-2xl font-extrabold text-[#AFAFAF] bg-white border-2 border-[#E5E5E5] hover:bg-[#F7F7F7]">KELUAR</button>
      </div>
      <div className="p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border-2 border-[#E5E5E5] flex flex-col items-center text-center shadow-sm"><span className="text-[#AFAFAF] font-extrabold uppercase text-xs tracking-wider mb-2">Total Murid</span><span className="text-5xl font-black text-[#1CB0F6]">{students.length}</span></div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border-2 border-[#E5E5E5] overflow-hidden h-full flex flex-col shadow-sm">
            <div className="px-6 py-4 bg-[#F7F7F7] border-b-2 border-[#E5E5E5]"><h3 className="font-black text-[#4B4B4B] uppercase tracking-wide">Progres Siswa Live</h3></div>
            <div className="flex-1 overflow-auto custom-scrollbar p-2">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="text-[#AFAFAF] sticky top-0 bg-white shadow-sm z-10"><tr><th className="px-6 py-4 font-black">NAMA</th><th className="px-6 py-4 font-black">SKOR</th></tr></thead>
                <tbody>
                  {subs.map(att => (
                    <tr key={att.id} className="border-b-2 border-[#F7F7F7]">
                      <td className="px-6 py-4 font-black">{users.find(u => u.id === att.userId)?.name}</td>
                      <td className="px-6 py-4 font-black text-lg text-[#58CC02]">{Math.round(att.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
