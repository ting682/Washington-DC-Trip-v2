import React from 'react';
import { SITE_FACTS, SITE_IMAGES, SITE_KNOWLEDGE_BASE, SITE_PHONES } from '../../data/tripData';

interface SiteDetailModalProps {
  siteKey: string | null;
  onClose: () => void;
  websiteUrl?: string;
}

export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  siteKey,
  onClose,
  websiteUrl,
}) => {
  if (!siteKey) return null;
  const data = SITE_KNOWLEDGE_BASE[siteKey];
  if (!data) return null;

  const facts = SITE_FACTS[siteKey] || [];
  const photo = SITE_IMAGES[siteKey];
  const phone = SITE_PHONES[siteKey];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg">
              <i className={`fa-solid ${data.icon || 'fa-landmark'}`}></i>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
                {data.category}
              </span>
              <h3 className="serif text-base sm:text-lg font-black text-slate-900 leading-snug">
                {data.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Photo */}
        {photo && (
          <figure className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="w-full h-48 sm:h-56 object-cover"
            />
            <figcaption className="px-3 py-1.5 text-[10px] text-slate-500 bg-white">
              <a
                href={photo.creditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600"
              >
                {photo.credit}
              </a>
            </figcaption>
          </figure>
        )}

        <div className="mt-4 space-y-4 text-xs">
          {/* WHAT IS IT */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <h4 className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1 text-blue-700">
              <i className="fa-solid fa-circle-question"></i> What is this place?
            </h4>
            <p className="text-slate-700 leading-relaxed font-normal">{data.what}</p>
          </div>

          {/* WHY IS IT IMPORTANT */}
          <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1">
              <i className="fa-solid fa-star text-amber-500"></i> Why is it important?
            </h4>
            <p className="text-indigo-900 leading-relaxed font-normal">{data.why}</p>
          </div>

          {/* KID-SPECIFIC HIGHLIGHT */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
            <h4 className="font-bold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1">
              <i className="fa-solid fa-binoculars text-amber-600"></i> What Kids (Ages 8 &amp; 11)
              Should Look For:
            </h4>
            <p className="text-amber-900 leading-relaxed font-normal">{data.kids}</p>
          </div>

          {/* TOP 10 QUICK FACTS */}
          {facts.length > 0 && (
            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
              <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2">
                <i className="fa-solid fa-list-ol text-emerald-600"></i> 10 Important Facts
              </h4>
              <ol className="list-decimal pl-5 space-y-1.5 text-emerald-950 leading-relaxed font-normal marker:font-bold marker:text-emerald-700">
                {facts.map((fact, fIdx) => (
                  <li key={fIdx}>{fact}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-center text-xs transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-globe"></i> Official Website
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone.number.replace(/[^0-9+]/g, '')}`}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-center text-xs transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-phone"></i> {phone.number}
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
