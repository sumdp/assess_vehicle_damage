'use client';

import { useState, useMemo } from 'react';

interface ClaimFormProps {
  onSubmit: (data: ClaimData) => void;
}

export interface ClaimData {
  policyNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  accidentDate: string;
  accidentDescription: string;
}

// Vehicle data - manufacturers and their models (alphabetically ordered)
const vehicleData: Record<string, string[]> = {
  'Audi': ['A3', 'A4', 'A6', 'e-tron GT', 'Q3', 'Q5', 'Q7', 'Q8', 'RS6', 'TT'],
  'BMW': ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'i4', 'iX', 'X1', 'X3', 'X5', 'X7'],
  'Chevrolet': ['Blazer', 'Bolt EV', 'Camaro', 'Colorado', 'Corvette', 'Equinox', 'Malibu', 'Silverado', 'Tahoe', 'Traverse'],
  'Ford': ['Bronco', 'Edge', 'Escape', 'Explorer', 'F-150', 'F-150 Lightning', 'Maverick', 'Mustang', 'Mustang Mach-E', 'Ranger'],
  'Honda': ['Accord', 'Civic', 'CR-V', 'HR-V', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline'],
  'Hyundai': ['Elantra', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Palisade', 'Santa Fe', 'Sonata', 'Tucson'],
  'Kia': ['EV6', 'EV9', 'Forte', 'K5', 'Seltos', 'Sorento', 'Sportage', 'Telluride'],
  'Lexus': ['ES', 'GX', 'IS', 'LC', 'LS', 'NX', 'RX', 'RZ', 'TX', 'UX'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'EQE', 'EQS', 'GLA', 'GLC', 'GLE', 'GLS', 'S-Class'],
  'Nissan': ['Altima', 'Ariya', 'Frontier', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra'],
  'Porsche': ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Rivian': ['R1S', 'R1T'],
  'Subaru': ['Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  'Toyota': ['4Runner', 'Camry', 'Corolla', 'GR86', 'Highlander', 'Prius', 'RAV4', 'Sequoia', 'Supra', 'Tacoma', 'Tundra'],
  'Volkswagen': ['Atlas', 'Golf', 'ID.4', 'ID.Buzz', 'Jetta', 'Passat', 'Taos', 'Tiguan'],
};

// Generate year options (current year down to 2010)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 2009 }, (_, i) => (currentYear - i).toString());

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Required field label component
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-gray-900 mb-1">
    {children} <span className="text-red-500">*</span>
  </label>
);

export default function ClaimForm({ onSubmit }: ClaimFormProps) {
  const [formData, setFormData] = useState<ClaimData>({
    policyNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    accidentDate: getTodayDate(),
    accidentDescription: '',
  });

  // Get available models based on selected make
  const availableModels = useMemo(() => {
    if (!formData.vehicleMake) return [];
    return vehicleData[formData.vehicleMake] || [];
  }, [formData.vehicleMake]);

  // Alphabetically sorted manufacturers
  const manufacturers = useMemo(() => Object.keys(vehicleData).sort(), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Reset model when make changes
    if (name === 'vehicleMake') {
      setFormData({ ...formData, vehicleMake: value, vehicleModel: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const selectClassName = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900";
  const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Claim Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <RequiredLabel>Policy Number</RequiredLabel>
            <input
              type="text"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleChange}
              required
              placeholder="e.g., POL-2024-123456"
              className={inputClassName}
            />
          </div>
          <div>
            <RequiredLabel>Accident Date</RequiredLabel>
            <input
              type="date"
              name="accidentDate"
              value={formData.accidentDate}
              onChange={handleChange}
              required
              max={getTodayDate()}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Vehicle Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <RequiredLabel>Make</RequiredLabel>
            <select
              name="vehicleMake"
              value={formData.vehicleMake}
              onChange={handleChange}
              required
              className={selectClassName}
            >
              <option value="">Select manufacturer</option>
              {manufacturers.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>
          <div>
            <RequiredLabel>Model</RequiredLabel>
            <select
              name="vehicleModel"
              value={formData.vehicleModel}
              onChange={handleChange}
              required
              disabled={!formData.vehicleMake}
              className={`${selectClassName} ${!formData.vehicleMake ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {formData.vehicleMake ? 'Select model' : 'Select make first'}
              </option>
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <RequiredLabel>Year</RequiredLabel>
            <select
              name="vehicleYear"
              value={formData.vehicleYear}
              onChange={handleChange}
              required
              className={selectClassName}
            >
              <option value="">Select year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <RequiredLabel>Accident Description</RequiredLabel>
        <textarea
          name="accidentDescription"
          value={formData.accidentDescription}
          onChange={handleChange}
          required
          rows={3}
          placeholder="Briefly describe what happened..."
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
      >
        Continue to Upload Photos
      </button>
    </form>
  );
}
