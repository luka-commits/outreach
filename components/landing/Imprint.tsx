import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ArrowLeft } from 'lucide-react';

interface ImprintProps {
  onBack: () => void;
  onSignIn: () => void;
}

export const Imprint: React.FC<ImprintProps> = ({ onBack, onSignIn }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar onSignIn={onSignIn} />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to home
        </button>

        <h1 className="text-4xl font-bold text-slate-900 mb-8">Legal Notice (Imprint)</h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Information according to § 5 TMG</h2>
            <div className="text-slate-600 leading-relaxed">
              <p className="font-medium text-slate-900">Luka Knieling</p>
              <p>Wiesmahdstrasse 4b</p>
              <p>82131 Gauting</p>
              <p>Germany</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact</h2>
            <div className="text-slate-600 leading-relaxed">
              <p>
                Phone:{' '}
                <a href="tel:+4917683300657" className="text-blue-600 hover:text-blue-700">
                  +49 176 8330 0657
                </a>
              </p>
              <p>
                Email:{' '}
                <a href="mailto:luka@flouence.com" className="text-blue-600 hover:text-blue-700">
                  luka@flouence.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Responsible for content according to § 55 Abs. 2 RStV</h2>
            <div className="text-slate-600 leading-relaxed">
              <p className="font-medium text-slate-900">Luka Knieling</p>
              <p>Wiesmahdstrasse 4b</p>
              <p>82131 Gauting</p>
              <p>Germany</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">EU Dispute Resolution</h2>
            <p className="text-slate-600 leading-relaxed">
              The European Commission provides a platform for online dispute resolution (OS):{' '}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              <br />
              Our email address can be found above in this imprint.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Consumer Dispute Resolution</h2>
            <p className="text-slate-600 leading-relaxed">
              We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Liability for Content</h2>
            <p className="text-slate-600 leading-relaxed">
              As a service provider, we are responsible for our own content on these pages according to § 7 Abs.1 TMG under general law. According to §§ 8 to 10 TMG, however, we are not obligated as a service provider to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Obligations to remove or block the use of information under general law remain unaffected. However, liability in this regard is only possible from the point in time at which we become aware of a specific legal violation. Upon becoming aware of such violations, we will remove this content immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Liability for Links</h2>
            <p className="text-slate-600 leading-relaxed">
              Our offer contains links to external websites of third parties, on whose contents we have no influence. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the pages is always responsible for the contents of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal contents were not recognizable at the time of linking. However, a permanent control of the contents of the linked pages is not reasonable without concrete evidence of a violation of law. Upon becoming aware of legal violations, we will remove such links immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Copyright</h2>
            <p className="text-slate-600 leading-relaxed">
              The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, or any form of commercialization of such material beyond the scope of the copyright law shall require the prior written consent of its respective author or creator. Downloads and copies of this site are only permitted for private, non-commercial use. Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. In particular, third-party content is marked as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. Upon becoming aware of legal violations, we will remove such content immediately.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};
