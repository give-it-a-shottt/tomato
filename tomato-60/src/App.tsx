import { useState, useEffect } from "react";

type TimerMode = "focus" | "shortBreak" | "longBreak";

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  goalTime: number; // 목표시간 (시간 단위)
  cycleCount: number; // 뽀모도로 사이클 반복 횟수
}

const DEFAULT_SETTINGS: TimerSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStartBreaks: true,
  autoStartFocus: false,
  goalTime: 12, // 기본 목표시간: 12시간
  cycleCount: 4, // 기본 사이클 횟수: 4
};

function App() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
  const [initialTime, setInitialTime] = useState(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [goalAchieved, setGoalAchieved] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 목표시간 달성 확인
  useEffect(() => {
    const goalSeconds = settings.goalTime * 3600;
    if (!goalAchieved && totalFocusTime >= goalSeconds) {
      setGoalAchieved(true);

      // 웹페이지 포커스 시도
      window.focus();

      // 브라우저 탭 타이틀 깜빡임 효과
      const originalTitle = document.title;
      const alertTitle = "🎉 목표 달성!";
      let count = 0;
      const maxCount = 10;

      const titleInterval = setInterval(() => {
        document.title = count % 2 === 0 ? alertTitle : originalTitle;
        count++;

        if (count >= maxCount) {
          clearInterval(titleInterval);
          document.title = originalTitle;
        }
      }, 1000);

      const stopFlashing = () => {
        clearInterval(titleInterval);
        document.title = originalTitle;
        window.removeEventListener("focus", stopFlashing);
      };

      window.addEventListener("focus", stopFlashing);

      // 알림 표시
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("목표 달성! 🎉", {
          body: `${settings.goalTime}시간 집중 목표를 달성했습니다! 축하합니다!`,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      // 축하 사운드 재생
      playGoalAchievedSound();
    }
  }, [totalFocusTime, settings.goalTime, goalAchieved]);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (mode === "focus") {
            setTotalFocusTime((total) => total + 1);
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    // 웹페이지 포커스 시도
    window.focus();

    // 브라우저 탭 타이틀 깜빡임 효과
    flashTitle();

    showNotification();
    playSound();

    if (mode === "focus") {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      if (newCount % 4 === 0) {
        switchMode("longBreak", settings.autoStartBreaks);
      } else {
        switchMode("shortBreak", settings.autoStartBreaks);
      }
    } else {
      switchMode("focus", settings.autoStartFocus);
    }
  };

  const flashTitle = () => {
    const originalTitle = document.title;
    const alertTitle = "⏰ 타이머 완료!";
    let count = 0;
    const maxCount = 10; // 5번 깜빡임

    const titleInterval = setInterval(() => {
      document.title = count % 2 === 0 ? alertTitle : originalTitle;
      count++;

      if (count >= maxCount) {
        clearInterval(titleInterval);
        document.title = originalTitle;
      }
    }, 1000);

    // 사용자가 창을 클릭하면 깜빡임 중지
    const stopFlashing = () => {
      clearInterval(titleInterval);
      document.title = originalTitle;
      window.removeEventListener("focus", stopFlashing);
    };

    window.addEventListener("focus", stopFlashing);
  };

  const showNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      const messages = {
        focus: "집중 시간 완료! 휴식하세요",
        shortBreak: "짧은 휴식 완료! 다시 집중할 시간입니다",
        longBreak: "긴 휴식 완료! 새로운 집중 시간을 시작하세요",
      };

      const notification = new Notification("뽀모도로 타이머", {
        body: messages[mode],
        requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
      });

      // 알림 클릭 시 창으로 포커스
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const playSound = () => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // 부드러운 멜로디: C5-E5-G5-C6 (도-미-솔-도)
    const melody = [
      { frequency: 523.25, start: 0, duration: 0.8 },      // C5
      { frequency: 659.25, start: 0.8, duration: 0.8 },    // E5
      { frequency: 783.99, start: 1.6, duration: 0.8 },    // G5
      { frequency: 1046.50, start: 2.4, duration: 1.6 },   // C6 (더 길게)
    ];

    melody.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = note.frequency;
      oscillator.type = "sine";

      // 부드러운 페이드 인/아웃
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + note.start);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + note.start + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + note.start + note.duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + note.start + note.duration);

      oscillator.start(audioContext.currentTime + note.start);
      oscillator.stop(audioContext.currentTime + note.start + note.duration);
    });
  };

  const playGoalAchievedSound = () => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // 축하 멜로디: C5-E5-G5-C6-G5-C6 (더 화려하게)
    const melody = [
      { frequency: 523.25, start: 0, duration: 0.3 },      // C5
      { frequency: 659.25, start: 0.3, duration: 0.3 },    // E5
      { frequency: 783.99, start: 0.6, duration: 0.3 },    // G5
      { frequency: 1046.50, start: 0.9, duration: 0.4 },   // C6
      { frequency: 783.99, start: 1.3, duration: 0.3 },    // G5
      { frequency: 1046.50, start: 1.6, duration: 0.8 },   // C6 (길게)
    ];

    melody.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = note.frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, audioContext.currentTime + note.start);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + note.start + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + note.start + note.duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + note.start + note.duration);

      oscillator.start(audioContext.currentTime + note.start);
      oscillator.stop(audioContext.currentTime + note.start + note.duration);
    });
  };

  const switchMode = (newMode: TimerMode, autoStart: boolean = false) => {
    const newTime = settings[newMode] * 60;
    setMode(newMode);
    setTimeLeft(newTime);
    setInitialTime(newTime);
    setIsRunning(autoStart);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialTime);
  };

  const updateSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    const newTime = newSettings[mode] * 60;
    setTimeLeft(newTime);
    setInitialTime(newTime);
    setShowSettings(false);
    // 목표시간이 변경되면 달성 상태 리셋
    if (newSettings.goalTime !== settings.goalTime) {
      setGoalAchieved(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatTotalTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  };

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  const getModeConfig = (m: TimerMode) => {
    const configs = {
      focus: {
        label: "집중",
        icon: "",
        color: "from-purple-500 to-pink-500",
      },
      shortBreak: {
        label: "짧은 휴식",
        icon: "",
        color: "from-green-500 to-teal-500",
      },
      longBreak: {
        label: "긴 휴식",
        icon: "",
        color: "from-blue-500 to-cyan-500",
      },
    };
    return configs[m];
  };

  const currentConfig = getModeConfig(mode);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 메인 카드 */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 relative">
          {/* 설정 버튼 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-6 right-6 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
            aria-label="설정">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">
              {currentConfig.label}
            </h1>

            {/* 뽀모도로 사이클 표시 */}
            <div className="flex justify-center gap-2 mb-2 flex-wrap max-w-md mx-auto">
              {Array.from({ length: settings.cycleCount }).map((_, index) => {
                const isMilestone = (index + 1) % 4 === 0; // 4번째마다 체크
                const isCompleted = index < pomodoroCount % settings.cycleCount;
                return (
                  <div
                    key={index}
                    className={`rounded-full transition-all duration-300 ${
                      isMilestone ? "w-3 h-3" : "w-2 h-2"
                    } ${
                      isCompleted
                        ? `bg-white ${isMilestone ? "scale-150" : "scale-125"}`
                        : "bg-white/30"
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-white/60 text-sm">
              세션 #{pomodoroCount + 1}{" "}
              {pomodoroCount % 4 === 3 ? "· 다음은 긴 휴식" : ""}
            </p>
          </div>

          {/* 원형 프로그레스 & 타이머 */}
          <div className="relative mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              {/* 배경 원 */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              {/* 프로그레스 원 */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            {/* 중앙 타이머 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-7xl font-bold text-white tracking-wider">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* 모드 선택 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => {
              const config = getModeConfig(m);
              return (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  disabled={isRunning}
                  className={`py-3 px-2 rounded-xl font-medium transition-all duration-300 ${
                    mode === m
                      ? "bg-white text-purple-600 shadow-lg scale-105"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:scale-105"
                  } ${
                    isRunning
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}>
                  <div className="text-sm">{config.label}</div>
                </button>
              );
            })}
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={toggleTimer}
              className={`flex-1 py-5 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${
                isRunning
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              }`}>
              {isRunning ? "정지" : "시작"}
            </button>
            <button
              onClick={resetTimer}
              className="py-5 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95">
              리셋
            </button>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">
                {pomodoroCount}
              </div>
              <div className="text-white/60 text-sm mt-1">완료</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">
                {formatTotalTime(totalFocusTime)}
              </div>
              <div className="text-white/60 text-sm mt-1">집중 시간</div>
            </div>
          </div>

          {/* 목표 달성 프로그레스 */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-sm font-medium">목표 달성</span>
              <span className="text-white text-sm font-bold">
                {Math.min(Math.round((totalFocusTime / (settings.goalTime * 3600)) * 100), 100)}%
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalFocusTime >= settings.goalTime * 3600
                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                    : "bg-gradient-to-r from-orange-400 to-pink-500"
                }`}
                style={{
                  width: `${Math.min((totalFocusTime / (settings.goalTime * 3600)) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="text-white/60 text-xs mt-2 text-center">
              목표: {settings.goalTime}시간 {totalFocusTime >= settings.goalTime * 3600 ? "✓ 달성!" : ""}
            </div>
          </div>
        </div>

        {/* 설정 모달 */}
        {showSettings && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}>
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                타이머 설정
              </h2>
              <SettingsForm
                settings={settings}
                onSave={updateSettings}
                onCancel={() => setShowSettings(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsForm({
  settings,
  onSave,
  onCancel,
}: {
  settings: TimerSettings;
  onSave: (settings: TimerSettings) => void;
  onCancel: () => void;
}) {
  const [focus, setFocus] = useState(settings.focus);
  const [shortBreak, setShortBreak] = useState(settings.shortBreak);
  const [longBreak, setLongBreak] = useState(settings.longBreak);
  const [autoStartBreaks, setAutoStartBreaks] = useState(
    settings.autoStartBreaks
  );
  const [autoStartFocus, setAutoStartFocus] = useState(settings.autoStartFocus);
  const [goalTime, setGoalTime] = useState(settings.goalTime);
  const [cycleCount, setCycleCount] = useState(settings.cycleCount);

  const handleSave = () => {
    onSave({ focus, shortBreak, longBreak, autoStartBreaks, autoStartFocus, goalTime, cycleCount });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          집중 시간 (분)
        </label>
        <input
          type="number"
          min="1"
          max="60"
          value={focus}
          onChange={(e) => setFocus(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none text-lg font-semibold"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          짧은 휴식 (분)
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={shortBreak}
          onChange={(e) => setShortBreak(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none text-lg font-semibold"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          긴 휴식 (분)
        </label>
        <input
          type="number"
          min="1"
          max="60"
          value={longBreak}
          onChange={(e) => setLongBreak(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg font-semibold"
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          목표 시간 (시간)
        </label>
        <input
          type="number"
          min="1"
          max="24"
          value={goalTime}
          onChange={(e) => setGoalTime(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none text-lg font-semibold"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          사이클 반복 횟수
        </label>
        <input
          type="number"
          min="1"
          max="12"
          value={cycleCount}
          onChange={(e) => setCycleCount(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none text-lg font-semibold"
        />
        <p className="text-xs text-gray-500 mt-1">
          표시할 점의 개수 (긴 휴식은 항상 4번째마다)
        </p>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoStartBreaks}
            onChange={(e) => setAutoStartBreaks(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">
            휴식 시간 자동 시작
          </span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoStartFocus}
            onChange={(e) => setAutoStartFocus(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">
            집중 시간 자동 시작
          </span>
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSave}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
          저장
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-all">
          취소
        </button>
      </div>
    </div>
  );
}

export default App;
