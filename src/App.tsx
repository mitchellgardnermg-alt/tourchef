import React from 'react';
import { ChefHat, ArrowRight, CheckCircle2, Zap, ShieldCheck, Clock, Play, FileText, Calculator, Truck, ShieldAlert, Globe, ClipboardCheck, Mail, Download, Lock, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadStripe } from '@stripe/stripe-js';
import { BUNDLE_FEATURES, BUNDLE_PRICE, BUNDLE_ORIGINAL_PRICE } from './types';
import { formatCurrency } from './lib/utils';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const IconMap: Record<string, any> = {
  Calculator, FileText, ShieldAlert, Truck, Globe, ClipboardCheck
};

type Page = 'home' | 'privacy' | 'terms' | 'support';

export default function App() {
  const [email, setEmail] = React.useState('');
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<Page>('home');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setIsSuccess(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });
      const session = await response.json();
      const stripe = await stripePromise;
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: session.id });
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setIsSubscribed(true);
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    window.location.href = '/api/download';
  };

  const renderLegalPage = (title: string, content: string) => (
    <div className="pt-32 pb-20 px-4 max-w-3xl mx-auto">
      <button 
        onClick={() => setCurrentPage('home')}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors"
      >
        <ArrowRight size={18} className="rotate-180" />
        Back to Home
      </button>
      <h1 className="text-4xl font-bold mb-8">{title}</h1>
      <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed space-y-6">
        {content.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-zinc-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">Bundle Unlocked!</h2>
          <p className="text-zinc-500 mb-8">
            Your Touring Catering Ops Bundle is ready. Check your email for the receipt and permanent download link.
          </p>
          <div className="space-y-3">
            <button 
              onClick={handleDownload}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download All Assets (.ZIP)
            </button>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              Includes 12 Templates + 5 SOP Guides
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (currentPage === 'privacy') return renderLegalPage('Privacy Policy', "We value your privacy. This policy explains how we handle your data.\n\nWe collect your email address when you subscribe to our newsletter or purchase our products. This information is used solely for delivering your purchase, providing support, and sending occasional updates if you've opted in.\n\nWe use Stripe for payment processing. We do not store your credit card information on our servers. Stripe's privacy policy governs their use of your data.\n\nWe do not sell or share your personal information with third parties for marketing purposes. You can unsubscribe from our emails at any time using the link provided in the footer of our messages.");
  if (currentPage === 'terms') return renderLegalPage('Terms of Service', "By purchasing our digital products, you agree to the following terms.\n\nLicense: You are granted a non-exclusive, non-transferable license to use these templates for your own business operations. You may not resell, redistribute, or sub-license the templates in their original or modified form.\n\nRefunds: Due to the digital nature of our products, all sales are final. We do not offer refunds once the files have been downloaded. If you have issues with your purchase, please contact our support team.\n\nLiability: Our templates are provided 'as is' without any warranty. We are not liable for any financial losses or operational issues resulting from the use of our templates. It is your responsibility to verify the accuracy of calculations and compliance with local regulations.");
  if (currentPage === 'support') return renderLegalPage('Support', "Need help with your templates? We're here for you.\n\nEmail us at: support@tourchefops.com\n\nOur typical response time is within 24 hours (Monday to Friday).\n\nCommon Questions:\n\n1. I didn't receive my download link: Check your spam folder first. If it's not there, email us with your order number.\n\n2. How do I edit the Excel files? Our spreadsheets are compatible with Microsoft Excel (2016 or later) and Google Sheets.\n\n3. Can I use these for multiple tours? Yes! Once purchased, you can use the templates for as many tours as you personally manage.");

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <ChefHat size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight">TourChef Ops<span className="text-brand-600">.</span></span>
          </div>
          <button 
            onClick={handleCheckout}
            className="text-sm font-bold bg-zinc-900 text-white px-5 py-2 rounded-full hover:bg-zinc-800 transition-all active:scale-95"
          >
            Get the Bundle
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold uppercase tracking-wider mb-6"
            >
              <Zap size={14} />
              Built by a Touring Chef
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight"
            >
              Stop Guessing. <br />
              <span className="text-brand-600">Start Touring.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-zinc-600 mb-10 leading-relaxed max-w-lg"
            >
              The ultimate operations bundle for touring and event catering teams. Built for high-pressure environments where every minute counts.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={handleCheckout}
                disabled={isLoading}
                className="btn-primary flex items-center gap-2 group text-lg px-8 py-4"
              >
                {isLoading ? 'Loading...' : 'Get the Bundle — £29'}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <ShieldCheck size={18} className="text-brand-600" />
                <span>One-time payment</span>
              </div>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            {/* Bundle Preview Visual */}
            <div className="relative aspect-square max-w-md mx-auto lg:ml-auto">
              {/* Stack of "Files" */}
              <div className="absolute top-0 right-0 w-4/5 h-4/5 bg-white rounded-2xl shadow-xl border border-zinc-100 rotate-6 translate-x-4 -translate-y-4 overflow-hidden p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator size={20} className="text-emerald-600" />
                  <span className="font-bold text-sm">Tour Costing Master.xlsx</span>
                </div>
                <div className="space-y-3 opacity-20">
                  <div className="h-4 bg-zinc-100 rounded w-full" />
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                  <div className="h-4 bg-zinc-100 rounded w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-12 bg-zinc-100 rounded" />
                    <div className="h-12 bg-zinc-100 rounded" />
                    <div className="h-12 bg-zinc-100 rounded" />
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 w-4/5 h-4/5 bg-white rounded-2xl shadow-xl border border-zinc-100 -rotate-3 overflow-hidden p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert size={20} className="text-red-600" />
                  <span className="font-bold text-sm">Dietary_Matrix.pdf</span>
                </div>
                <div className="space-y-3 opacity-20">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full" />
                    <div className="h-8 bg-zinc-100 rounded flex-grow" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-full" />
                    <div className="h-8 bg-zinc-100 rounded flex-grow" />
                  </div>
                  <div className="h-24 bg-zinc-100 rounded w-full" />
                </div>
              </div>
              <div className="absolute top-8 right-8 w-4/5 h-4/5 bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden p-8 text-white">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                    <ChefHat size={24} />
                  </div>
                  <span className="font-bold text-lg">TourChef Ops Bundle</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <CheckCircle2 size={16} className="text-brand-500" />
                    <span>12 Professional Templates</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <CheckCircle2 size={16} className="text-brand-500" />
                    <span>5 SOP Guides for the Road</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <CheckCircle2 size={16} className="text-brand-500" />
                    <span>Lifetime Access & Updates</span>
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Price</span>
                    <span className="text-2xl font-bold">£29.00</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What's Inside - Expanded */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What's Inside the Bundle?</h2>
            <p className="text-zinc-500">I've spent 10 years in loading bays and temporary kitchens. These are the exact tools I use to stay sane and profitable.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BUNDLE_FEATURES.map((feature, i) => {
              const Icon = IconMap[feature.icon];
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-3xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:shadow-xl hover:shadow-zinc-200/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-zinc-100 mb-6 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-6">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-zinc-600">
                        <ChevronRight size={14} className="text-brand-500 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Email Capture / Freebie */}
      <section className="py-24 bg-zinc-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto bg-zinc-800 rounded-[2.5rem] p-8 md:p-16 border border-zinc-700 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-shrink-0 w-48 h-64 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl rotate-3 flex flex-col p-4">
              <div className="w-full h-8 bg-zinc-800 rounded mb-4" />
              <div className="space-y-2">
                <div className="w-full h-2 bg-zinc-800 rounded" />
                <div className="w-3/4 h-2 bg-zinc-800 rounded" />
                <div className="w-full h-2 bg-zinc-800 rounded" />
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="w-8 h-8 bg-brand-600 rounded-full" />
                <div className="w-12 h-4 bg-zinc-800 rounded" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 backdrop-blur-[2px] rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold uppercase tracking-widest">Free Template</span>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Get the Daily Briefing Sheet for Free.</h2>
              <p className="text-zinc-400 mb-8 text-lg">
                The exact sheet I use to brief my team every morning. Download it now and join 2,000+ touring chefs getting weekly ops tips.
              </p>
              <AnimatePresence mode="wait">
                {isSubscribed ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3 text-brand-500 font-bold">
                      <CheckCircle2 size={24} />
                      Subscription confirmed!
                    </div>
                    <button 
                      onClick={handleDownload}
                      className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 w-fit"
                    >
                      <Download size={16} />
                      Download Free Template
                    </button>
                  </motion.div>
                ) : (
                  <motion.form 
                    onSubmit={handleSubscribe}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-grow bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-3 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? 'Sending...' : 'Send it to me'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Final CTA */}
      <section className="py-32 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl border border-zinc-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-brand-600" />
            <h2 className="text-4xl font-bold mb-6">Ready to level up your tour ops?</h2>
            <p className="text-zinc-500 mb-10 text-lg">
              Get the full bundle today for a one-time launch price. No subscriptions. No hidden fees. Just better operations.
            </p>
            <div className="flex flex-col items-center gap-6 mb-10">
              <div className="flex items-center gap-4">
                <span className="text-6xl font-black text-zinc-900">£{BUNDLE_PRICE}</span>
                <div className="text-left">
                  <p className="text-zinc-400 line-through font-bold">£{BUNDLE_ORIGINAL_PRICE}</p>
                  <p className="text-brand-600 font-bold text-sm">Launch Special</p>
                </div>
              </div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full btn-primary text-xl py-5 rounded-2xl flex items-center justify-center gap-3 group"
            >
              {isLoading ? 'Processing...' : 'Get the Bundle Now'}
              <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Lock size={14} />
                Secure Checkout
              </div>
              <div className="flex items-center gap-2">
                <Download size={14} />
                Instant Delivery
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} />
                Lifetime Access
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-white">
              <ChefHat size={14} />
            </div>
            <span className="font-bold text-sm tracking-tight">TourChef Ops</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <button onClick={() => setCurrentPage('support')} className="hover:text-zinc-900">Support</button>
            <button onClick={() => setCurrentPage('privacy')} className="hover:text-zinc-900">Privacy</button>
            <button onClick={() => setCurrentPage('terms')} className="hover:text-zinc-900">Terms</button>
          </div>
          <p className="text-xs text-zinc-400">© 2026 TourChef Ops. Built for the road.</p>
        </div>
      </footer>
    </div>
  );
}
