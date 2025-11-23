'use client';

import { useState, useMemo } from 'react';

interface ClaimFormProps {
  onSubmit: (data: ClaimData) => void;
}

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  trim: string;
  value: number;
}

export interface ClaimData {
  policyNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleTrim?: string;
  vehicleValue?: number;
  vin?: string;
  accidentDate: string;
  accidentDescription: string;
}

// Demo VINs for easy selection during demos
const demoVINs: { vin: string; label: string; info: VehicleInfo }[] = [
  { vin: '5YJ3E1ET5RF847523', label: '2024 Tesla Model 3 Performance', info: { year: 2024, make: 'Tesla', model: 'Model 3', trim: 'Performance', value: 52990 } },
  { vin: '1HGBH41JXMN109186', label: '2021 Honda Accord EX-L', info: { year: 2021, make: 'Honda', model: 'Accord', trim: 'EX-L', value: 28000 } },
  { vin: '5YJSA1E14HF123456', label: '2017 Tesla Model S 75D', info: { year: 2017, make: 'Tesla', model: 'Model S', trim: '75D', value: 42000 } },
  { vin: '1FTFW1ET5DFC12345', label: '2013 Ford F-150 XLT', info: { year: 2013, make: 'Ford', model: 'F-150', trim: 'XLT', value: 18500 } },
  { vin: 'WVWZZZ3CZWE123456', label: '2023 Volkswagen ID.4 Pro S', info: { year: 2023, make: 'Volkswagen', model: 'ID.4', trim: 'Pro S', value: 48000 } },
  { vin: '1G1YY22G965109876', label: '2022 Chevrolet Corvette Stingray', info: { year: 2022, make: 'Chevrolet', model: 'Corvette', trim: 'Stingray', value: 65000 } },
  { vin: 'WBA8E9C55GK123456', label: '2021 BMW 3 Series 330i', info: { year: 2021, make: 'BMW', model: '3 Series', trim: '330i', value: 41000 } },
  { vin: '5TDKZ3DC8LS123456', label: '2020 Toyota Highlander XLE', info: { year: 2020, make: 'Toyota', model: 'Highlander', trim: 'XLE', value: 35000 } },
];

// Mock VIN decoder - in production would call NHTSA API
const decodeVIN = (vin: string): VehicleInfo | null => {
  // Build lookup from demo VINs
  const mockVehicles: Record<string, VehicleInfo> = {};
  demoVINs.forEach(d => { mockVehicles[d.vin] = d.info; });

  // Check exact match first
  if (mockVehicles[vin.toUpperCase()]) {
    return mockVehicles[vin.toUpperCase()];
  }

  // For demo purposes, generate plausible data for unknown VINs
  if (vin.length === 17) {
    return { year: 2022, make: 'Unknown', model: 'Vehicle', trim: 'Base', value: 25000 };
  }

  return null;
};

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
    vehicleTrim: '',
    vehicleValue: undefined,
    vin: '',
    accidentDate: getTodayDate(),
    accidentDescription: '',
  });
  const [vinLookupResult, setVinLookupResult] = useState<VehicleInfo | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);

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

  const handleVINLookup = () => {
    const vin = formData.vin?.trim().toUpperCase() || '';
    setVinError(null);

    if (vin.length < 17) {
      setVinError('VIN must be 17 characters');
      return;
    }

    const result = decodeVIN(vin);
    if (result) {
      setVinLookupResult(result);
      setFormData({
        ...formData,
        vin: vin,
        vehicleMake: result.make,
        vehicleModel: result.model,
        vehicleYear: result.year.toString(),
        vehicleTrim: result.trim,
        vehicleValue: result.value,
      });
    } else {
      setVinError('Unable to decode VIN. Please enter vehicle details manually.');
      setVinLookupResult(null);
    }
  };

  const handleClearVIN = () => {
    setVinLookupResult(null);
    setVinError(null);
    setFormData({
      ...formData,
      vin: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleTrim: '',
      vehicleValue: undefined,
    });
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

        {/* VIN Lookup Section */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            Quick Fill with VIN (recommended)
          </label>

          {/* Demo VIN Dropdown */}
          <div className="mb-3">
            <label className="block text-xs text-blue-700 mb-1">Select a demo vehicle:</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const selected = demoVINs.find(d => d.vin === e.target.value);
                  if (selected) {
                    setFormData({
                      ...formData,
                      vin: selected.vin,
                      vehicleMake: selected.info.make,
                      vehicleModel: selected.info.model,
                      vehicleYear: selected.info.year.toString(),
                      vehicleTrim: selected.info.trim,
                      vehicleValue: selected.info.value,
                    });
                    setVinLookupResult(selected.info);
                    setVinError(null);
                  }
                }
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
            >
              <option value="">Choose a demo vehicle...</option>
              {demoVINs.map((demo) => (
                <option key={demo.vin} value={demo.vin}>
                  {demo.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center mb-3">
            <div className="flex-grow border-t border-blue-200"></div>
            <span className="flex-shrink mx-3 text-xs text-blue-600">or enter VIN manually</span>
            <div className="flex-grow border-t border-blue-200"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              name="vin"
              value={formData.vin || ''}
              onChange={(e) => {
                setFormData({ ...formData, vin: e.target.value.toUpperCase() });
                setVinError(null);
              }}
              maxLength={17}
              placeholder="Enter 17-character VIN"
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 font-mono tracking-wider ${
                vinError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={handleVINLookup}
              disabled={(formData.vin?.length || 0) < 10}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Lookup
            </button>
            {vinLookupResult && (
              <button
                type="button"
                onClick={handleClearVIN}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                title="Clear VIN"
              >
                Clear
              </button>
            )}
          </div>
          {vinError && (
            <p className="text-sm text-red-600 mt-2">{vinError}</p>
          )}
        </div>

        {/* Vehicle Info Display (when VIN decoded) */}
        {vinLookupResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-600 text-lg">✓</span>
              <span className="font-medium text-green-800">Vehicle Identified</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <span className="text-gray-600 block">Year</span>
                <span className="font-semibold text-gray-900">{vinLookupResult.year}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Make</span>
                <span className="font-semibold text-gray-900">{vinLookupResult.make}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Model</span>
                <span className="font-semibold text-gray-900">{vinLookupResult.model}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Trim</span>
                <span className="font-semibold text-gray-900">{vinLookupResult.trim}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Est. Value</span>
                <span className="font-semibold text-green-700">${vinLookupResult.value.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry (shown when no VIN decoded) */}
        {!vinLookupResult && (
          <>
            <p className="text-sm text-gray-500 mb-3">Or enter vehicle details manually:</p>
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
          </>
        )}
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
