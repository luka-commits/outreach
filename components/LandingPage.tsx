
import React, { useState } from 'react';
import { Rocket, CheckCircle2, ArrowRight, BarChart3, Users, Zap, Play, ShieldCheck, Layout } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LandingPage: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setLoading(true);
            await signInWithGoogle();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white">
                            <Rocket size={24} fill="currentColor" />
                        </div>
                        <span className="font-black text-xl tracking-tight">OutreachPilot</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleLogin}
                            className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors hidden md:block"
                        >
                            Log in
                        </button>
                        <button
                            onClick={handleLogin}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all hover:shadow-lg active:scale-95"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-white to-white z-0" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 text-center lg:text-left animate-in slide-in-from-bottom-8 duration-700 fade-in">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                            </span>
                            Complete Outreach Engine
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]">
                            Tame the Chaos. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Centralize your Outreach.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Stop juggling DMs, emails, and calls across scattered apps. OutreachPilot unifies Instagram, LinkedIn, and Phone outreach into one organized pipeline.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-300 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                {loading ? 'Loading...' : 'Start your Engine'}
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative animate-in slide-in-from-right-8 duration-1000 delay-200 fade-in hidden lg:block">
                        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.5rem] blur-2xl opacity-20 animate-pulse" />
                        <div className="bg-slate-900 rounded-[2rem] p-4 shadow-2xl relative border border-slate-800/50">
                            {/* Fake UI Container */}
                            <div className="bg-slate-800 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                                {/* Connecting Lines (Decorative) */}
                                <div className="absolute top-10 left-10 w-full h-full border-l-2 border-dashed border-white/5 pointer-events-none" />

                                {/* Channels Flowing In */}
                                <div className="flex justify-between items-center mb-8 px-4">
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 text-pink-500">
                                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
                                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500">
                                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </div>
                                    </div>
                                    <div className="text-white/30 text-xs font-mono">Input Sources</div>
                                </div>

                                {/* Central List */}
                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Unified Pipeline</div>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/5 group hover:border-indigo-500/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-bold">L{i}</div>
                                                <div className="space-y-1">
                                                    <div className="w-32 h-3 bg-slate-600 rounded" />
                                                    <div className="flex gap-2">
                                                        <div className="w-4 h-4 rounded bg-indigo-500/20 border border-indigo-500/30" />
                                                        <div className="w-12 h-2 bg-slate-700 rounded self-center" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-20 h-6 bg-green-500/10 rounded border border-green-500/20 text-green-400 text-[10px] flex items-center justify-center font-bold">In Progress</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">The Complete Outreach Engine</h2>
                        <p className="text-slate-500 text-lg">From finding leads to closing deals, everything happens in one place.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Zap />}
                            title="Unified Channels"
                            desc="No more tab switching. Manage Instagram DMs, Emails, and Phone calls in one clear daily queue."
                        />
                        <FeatureCard
                            icon={<Users />}
                            title="Lead Finder & Organization"
                            desc="Import thousands of leads or find new ones directly. Organize them by status, strategy, and value."
                        />
                        <FeatureCard
                            icon={<BarChart3 />}
                            title="Performance Reporting"
                            desc="Track exactly what's working. See which channels bring results and optimize your strategy."
                        />
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-24 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] group-hover:bg-indigo-600/30 transition-all duration-700" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] group-hover:bg-purple-600/30 transition-all duration-700" />

                        <div className="relative z-10 space-y-8">
                            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Ready to pilot your growth?</h2>
                            <p className="text-slate-400 text-xl max-w-xl mx-auto">Join the new standard of outreach management today.</p>
                            <button
                                onClick={handleLogin}
                                className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-2xl shadow-white/10"
                            >
                                Get Started Now
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-400 font-medium text-sm">© 2024 OutreachPilot. All rights reserved.</p>
                    <div className="flex gap-8">
                        <a href="#" className="text-slate-400 hover:text-indigo-600 text-sm font-bold transition-colors">Privacy</a>
                        <a href="#" className="text-slate-400 hover:text-indigo-600 text-sm font-bold transition-colors">Terms</a>
                        <a href="#" className="text-slate-400 hover:text-indigo-600 text-sm font-bold transition-colors">Twitter</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 group">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
            {React.cloneElement(icon as React.ReactElement, { size: 28, className: "group-hover:rotate-12 transition-transform" })}
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
);

export default LandingPage;
