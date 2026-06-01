'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DEPARTMENTS } from '@/lib/constants';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    fullName: '',
    nickname: '',
    studentId: '',
    department: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── 유효성 검사 함수들 ──────────────────────────
  const validateEmail = (email: string) => {
    if (!email) return '이메일을 입력해 주세요.';
    if (!email.endsWith('@chungbuk.ac.kr')) return '충북대학교 이메일(@chungbuk.ac.kr)만 가입 가능합니다.';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return '비밀번호를 입력해 주세요.';
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (!/[a-zA-Z]/.test(password)) return '비밀번호에 영문을 포함해야 합니다.';
    if (!/[0-9]/.test(password)) return '비밀번호에 숫자를 포함해야 합니다.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return '비밀번호에 특수문자를 포함해야 합니다.';
    return '';
  };

  const validatePasswordConfirm = (confirm: string) => {
    if (!confirm) return '비밀번호 확인을 입력해 주세요.';
    if (confirm !== form.password) return '비밀번호가 일치하지 않습니다.';
    return '';
  };

  const validateFullName = (name: string) => {
    if (!name) return '이름을 입력해 주세요.';
    if (!/^[가-힣]{2,5}$/.test(name)) return '올바른 이름을 입력해 주세요. (한글 2~5자)';
    return '';
  };

  const validateNickname = (nickname: string) => {
    if (!nickname) return '닉네임을 입력해 주세요.';
    if (nickname.length < 2 || nickname.length > 10) return '닉네임은 2~10자여야 합니다.';
    return '';
  };

  const validateStudentId = (id: string) => {
    if (!id) return '학번을 입력해 주세요.';
    if (!/^[0-9]{10}$/.test(id)) return '학번은 10자리 숫자여야 합니다.';
    const year = parseInt(id.substring(0, 4));
    const currentYear = new Date().getFullYear();
    if (year < 1990 || year > currentYear) return '유효하지 않은 입학연도입니다.';
    return '';
  };

  // ─── 필드 변경 핸들러 ────────────────────────────
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // 실시간 유효성 검사
    let error = '';
    switch (field) {
      case 'email': error = validateEmail(value); break;
      case 'password': error = validatePassword(value); break;
      case 'passwordConfirm': error = validatePasswordConfirm(value); break;
      case 'fullName': error = validateFullName(value); break;
      case 'nickname':
        error = validateNickname(value);
        if (!error) setNicknameStatus('idle');
        break;
      case 'studentId': error = validateStudentId(value); break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // ─── 닉네임 중복 확인 ───────────────────────────
  const checkNickname = async () => {
    const error = validateNickname(form.nickname);
    if (error) {
      setErrors((prev) => ({ ...prev, nickname: error }));
      return;
    }

    setNicknameStatus('checking');
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', form.nickname)
        .maybeSingle();

      if (data) {
        setNicknameStatus('taken');
        setErrors((prev) => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }));
      } else {
        setNicknameStatus('available');
        setErrors((prev) => ({ ...prev, nickname: '' }));
      }
    } catch {
      setNicknameStatus('idle');
    }
  };

  // ─── 폼 제출 ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitResult(null);

    // 전체 유효성 검사
    const newErrors: Record<string, string> = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      passwordConfirm: validatePasswordConfirm(form.passwordConfirm),
      fullName: validateFullName(form.fullName),
      nickname: validateNickname(form.nickname),
      studentId: validateStudentId(form.studentId),
      department: form.department ? '' : '학과를 선택해 주세요.',
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;
    if (nicknameStatus !== 'available') {
      setErrors((prev) => ({ ...prev, nickname: '닉네임 중복 확인을 해주세요.' }));
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            nickname: form.nickname,
            student_id: form.studentId,
            department: form.department,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) {
        setSubmitResult({ type: 'error', message: error.message });
        return;
      }

      if (data.user) {
        setSubmitResult({
          type: 'success',
          message: '인증 메일이 발송되었습니다. 이메일을 확인해 주세요.',
        });
      }
    } catch {
      setSubmitResult({ type: 'error', message: '회원가입 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border ${
      errors[field] ? 'border-danger bg-danger/5' : 'border-border'
    } bg-white text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm`;

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold">CB</span>
          </div>
          <span className="text-2xl font-bold text-primary">충북match</span>
        </Link>
        <p className="text-text-secondary mt-2 text-sm">충북대학교 재학생 전용 회원가입</p>
      </div>

      {/* Form Card */}
      <div className="bg-card rounded-2xl shadow-card p-8 border border-border">
        {submitResult?.type === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">메일을 확인해 주세요</h2>
            <p className="text-text-secondary text-sm mb-6">{submitResult.message}</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-light transition-colors"
            >
              로그인으로 이동
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitResult?.type === 'error' && (
              <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {submitResult.message}
              </div>
            )}

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">학교 이메일</label>
              <input
                type="email"
                placeholder="userid@chungbuk.ac.kr"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClass('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="영문 + 숫자 + 특수문자 8자 이상"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={inputClass('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="비밀번호 재입력"
                  value={form.passwordConfirm}
                  onChange={(e) => handleChange('passwordConfirm', e.target.value)}
                  className={inputClass('passwordConfirm')}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.passwordConfirm && <p className="mt-1 text-xs text-danger">{errors.passwordConfirm}</p>}
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">이름 (실명)</label>
              <input
                type="text"
                placeholder="홍길동"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className={inputClass('fullName')}
                maxLength={5}
              />
              {errors.fullName && <p className="mt-1 text-xs text-danger">{errors.fullName}</p>}
            </div>

            {/* 닉네임 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">닉네임</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="2~10자"
                  value={form.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  className={`flex-1 ${inputClass('nickname')}`}
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={checkNickname}
                  disabled={nicknameStatus === 'checking'}
                  className="px-4 py-3 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {nicknameStatus === 'checking' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '중복 확인'
                  )}
                </button>
              </div>
              {errors.nickname && <p className="mt-1 text-xs text-danger">{errors.nickname}</p>}
              {nicknameStatus === 'available' && (
                <p className="mt-1 text-xs text-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> 사용 가능한 닉네임입니다.
                </p>
              )}
            </div>

            {/* 학번 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">학번</label>
              <input
                type="text"
                placeholder="2025000001"
                value={form.studentId}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  handleChange('studentId', v);
                }}
                className={inputClass('studentId')}
                maxLength={10}
                pattern="[0-9]{10}"
                inputMode="numeric"
              />
              {errors.studentId && <p className="mt-1 text-xs text-danger">{errors.studentId}</p>}
            </div>

            {/* 소속 학과 */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">소속 학과</label>
              <select
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className={`${inputClass('department')} ${!form.department ? 'text-muted' : ''}`}
              >
                <option value="">학과를 선택해 주세요</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && <p className="mt-1 text-xs text-danger">{errors.department}</p>}
            </div>

            {/* 제출 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  가입 처리 중...
                </>
              ) : (
                '가입하기'
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-muted mt-6">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
