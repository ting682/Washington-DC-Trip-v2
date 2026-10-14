import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-black text-slate-900">Trip Hub &amp; Addresses</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Departure Residence
            </span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">2232 Shenley Park Ln</p>
            <p className="text-slate-600 mt-0.5">Duluth, GA 30097</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Base Hotel
            </span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">
              Holiday Inn Washington-Central
            </p>
            <p className="text-slate-600 mt-0.5">
              1501 Rhode Island Ave NW, Washington, DC 20005
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <a
                href="https://www.ihg.com/holidayinn/hotels/us/en/washington/wascc/hoteldetail"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
              >
                <i className="fa-solid fa-globe"></i> Official Site
              </a>
              <a
                href="tel:2024832000"
                className="inline-flex items-center gap-1 text-slate-600 font-bold hover:underline"
              >
                <i className="fa-solid fa-phone"></i> Call
              </a>
            </div>
            <p className="mt-2.5 text-slate-600">
              Xiaobin Lange has a separate room here, Oct 15–20.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
