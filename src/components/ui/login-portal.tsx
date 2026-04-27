'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Chrome, Twitter, Gamepad2 } from 'lucide-react';

interface LoginFormProps {
    onSubmit: (email: string, password: string, remember: boolean) => void;
    isSubmitting?: boolean;
    isSuccess?: boolean;
    error?: string;
}

interface VideoBackgroundProps {
    videoUrl: string;
}

interface FormInputProps {
    icon: React.ReactNode;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

interface SocialButtonProps {
    icon: React.ReactNode;
    name: string;
}

interface ToggleSwitchProps {
    checked: boolean;
    onChange: () => void;
    id: string;
}

// FormInput Component
const FormInput: React.FC<FormInputProps> = ({ icon, type, placeholder, value, onChange, required }) => {
    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-blue-400 transition-colors">
                {icon}
            </div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 transition-all [&:-webkit-autofill]:shadow-[0_0_0_1000px_#1e293b_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            />
        </div>
    );
};

// SocialButton Component
const SocialButton: React.FC<SocialButtonProps> = ({ icon }) => {
    return (
        <button className="flex items-center justify-center p-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors">
            {icon}
        </button>
    );
};

// ToggleSwitch Component
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => {
    return (
        <div className="relative inline-block w-10 h-5 cursor-pointer">
            <input
                type="checkbox"
                id={id}
                className="sr-only"
                checked={checked}
                onChange={onChange}
            />
            <div className={`absolute inset-0 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-purple-600' : 'bg-white/20'}`}>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${checked ? 'transform translate-x-5' : ''}`} />
            </div>
        </div>
    );
};

// VideoBackground Component
const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            const playVideo = async () => {
                try {
                    await videoRef.current?.play();
                } catch (error) {
                    console.error("Video autoplay failed:", error);
                }
            };
            playVideo();
        }
    }, [videoUrl]);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
            <div className="absolute inset-0 bg-black/40 z-10" />
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                key={videoUrl}
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

// Main LoginForm Component
const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isSubmitting: externalSubmitting, isSuccess: externalSuccess, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const [localSuccess, setLocalSuccess] = useState(false);

    const isSubmitting = externalSubmitting ?? localSubmitting;
    const isSuccess = externalSuccess ?? localSuccess;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (externalSubmitting === undefined) {
            setLocalSubmitting(true);
            // Simulate for internal demo if no external control
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLocalSuccess(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            onSubmit(email, password, remember);
            setLocalSubmitting(false);
            setLocalSuccess(false);
        } else {
            onSubmit(email, password, remember);
        }
    };

    return (
        <div className="p-8 rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 shadow-2xl">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold mb-2 relative group">
                    <span className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-indigo-500/30 to-purple-500/30 blur-xl opacity-75 group-hover:opacity-100 transition-all duration-500"></span>
                    <span className="relative inline-block text-3xl font-bold mb-2 text-white tracking-tight">
                        Space Tech Solution
                    </span>
                </h2>
                <p className="text-white/80 flex flex-col items-center space-y-1">
                    <span className="relative group cursor-default">
                        <span className="relative inline-block">Secure Enterprise Portal</span>
                    </span>
                    <span className="text-xs text-white/50">
                        Enter your credentials to access the dashboard
                    </span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="group">
                    <FormInput
                        icon={<Mail size={18} />}
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="relative group">
                    <FormInput
                        icon={<Lock size={18} />}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white focus:outline-none transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div onClick={() => setRemember(!remember)} className="cursor-pointer">
                            <ToggleSwitch
                                checked={remember}
                                onChange={() => setRemember(!remember)}
                                id="remember-me"
                            />
                        </div>
                        <label
                            htmlFor="remember-me"
                            className="text-sm text-white/80 cursor-pointer hover:text-white transition-colors"
                            onClick={() => setRemember(!remember)}
                        >
                            Remember me
                        </label>
                    </div>
                    <a href="/forgot-password" title="Forgot Password" className="text-sm text-white/80 hover:text-white transition-colors">
                        Forgot password?
                    </a>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-lg ${isSuccess
                            ? 'animate-success'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white font-semibold transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40`}
                >
                    {isSubmitting ? 'Verifying...' : 'Sign In'}
                </button>
            </form>

            <div className="mt-8">
                <div className="relative flex items-center justify-center">
                    <div className="border-t border-white/10 absolute w-full"></div>
                    <div className="bg-transparent px-4 relative text-white/60 text-sm">
                        secure access
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                    <SocialButton icon={<Chrome size={18} />} name="Google" />
                    <SocialButton icon={<Twitter size={18} />} name="X" />
                    <SocialButton icon={<Lock size={18} />} name="SSO" />
                </div>
            </div>

            <p className="mt-8 text-center text-sm text-white/60">
                Don't have an account?{' '}
                <a href="#" className="font-medium text-white hover:text-purple-300 transition-colors">
                    Create Account
                </a>
            </p>
        </div>
    );
};

// Export as default components
const LoginPage = {
    LoginForm,
    VideoBackground
};

export default LoginPage;
