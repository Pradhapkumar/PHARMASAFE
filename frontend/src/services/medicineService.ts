import { Medicine } from '../types/api';
import apiClient from './apiClient';

export type { Medicine };
export type MedicineCreatePayload = Partial<Medicine>;

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const MOCK_MEDICINES: Medicine[] = [
  {
    id: 'med_paracet_500',
    brand_name: 'Paracetamol 500mg IP',
    generic_name: 'Paracetamol',
    composition: 'Paracetamol IP 500mg, Excipients q.s.',
    dosage_form: 'Tablet',
    strength: '500mg',
    storage_temp_min: '15°C',
    storage_temp_max: '25°C',
    manufacturer_id: 'org_pfizer_india',
    created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 'med_amox_500',
    brand_name: 'Amoxil 500mg',
    generic_name: 'Amoxicillin Trihydrate',
    composition: 'Amoxicillin IP 500mg, Excipients q.s.',
    dosage_form: 'Capsule',
    strength: '500mg',
    storage_temp_min: '15°C',
    storage_temp_max: '25°C',
    manufacturer_id: 'org_pfizer_india',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'med_azith_250',
    brand_name: 'Azithral 250',
    generic_name: 'Azithromycin',
    composition: 'Azithromycin IP 250mg',
    dosage_form: 'Tablet',
    strength: '250mg',
    storage_temp_min: '15°C',
    storage_temp_max: '30°C',
    manufacturer_id: 'org_pfizer_india',
    created_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'med_remdes_100',
    brand_name: 'Remdec 100mg',
    generic_name: 'Remdesivir',
    composition: 'Remdesivir 100mg Lyophilized powder',
    dosage_form: 'Injection',
    strength: '100mg',
    storage_temp_min: '2°C',
    storage_temp_max: '8°C',
    manufacturer_id: 'org_pfizer_india',
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'med_paracet_650',
    brand_name: 'Dolo-650',
    generic_name: 'Paracetamol',
    composition: 'Paracetamol IP 650mg',
    dosage_form: 'Tablet',
    strength: '650mg',
    storage_temp_min: '15°C',
    storage_temp_max: '25°C',
    manufacturer_id: 'org_sun_pharma',
    created_at: '2024-02-10T00:00:00Z',
  },
];

class MedicineService {
  private medicines: Medicine[] = [...MOCK_MEDICINES];

  async getMedicines(search?: string): Promise<Medicine[]> {
    if (!USE_MOCK) {
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await apiClient.request<Medicine[]>(`/medicines${query}`);
        if (Array.isArray(res)) {
          return res;
        }
      } catch (err) {
        console.warn('Backend /medicines failed, falling back to mock:', err);
      }
    }

    if (search) {
      const q = search.toLowerCase();
      return this.medicines.filter(
        m =>
          m.brand_name.toLowerCase().includes(q) ||
          m.generic_name.toLowerCase().includes(q) ||
          m.strength.toLowerCase().includes(q) ||
          m.dosage_form.toLowerCase().includes(q)
      );
    }
    return [...this.medicines];
  }

  async getMedicineById(id: string): Promise<Medicine | undefined> {
    if (!USE_MOCK) {
      try {
        return await apiClient.request<Medicine>(`/medicines/${id}`);
      } catch (err) {
        console.warn(`Backend /medicines/${id} failed, using mock:`, err);
      }
    }
    return this.medicines.find(m => m.id === id);
  }

  async createMedicine(data: Partial<Medicine>): Promise<Medicine> {
    const payload = {
      brand_name: data.brand_name || 'New Medicine',
      generic_name: data.generic_name || 'Generic Compound',
      composition: data.composition || 'Active Pharma Ingredient',
      dosage_form: data.dosage_form || 'Tablet',
      strength: data.strength || '500mg',
      storage_temp_min: data.storage_temp_min || '15°C',
      storage_temp_max: data.storage_temp_max || '25°C',
      manufacturer_id: data.manufacturer_id || undefined,
    };
    if (!USE_MOCK) {
      return await apiClient.request<Medicine>('/medicines', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const newMed: Medicine = {
      id: `med_${Date.now()}`,
      ...payload,
      manufacturer_id: payload.manufacturer_id || 'org_pfizer_india',
      created_at: new Date().toISOString(),
    };
    this.medicines.unshift(newMed);
    return newMed;
  }
}

export const medicineService = new MedicineService();
export default medicineService;
