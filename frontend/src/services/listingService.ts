import { OnlineSurveillanceItem } from '../types/api';
import { MOCK_SURVEILLANCE } from '../mocks/mockData';

class ListingService {
  private listings: OnlineSurveillanceItem[] = [...MOCK_SURVEILLANCE];

  async getListings(highRiskOnly: boolean = false): Promise<OnlineSurveillanceItem[]> {
    if (highRiskOnly) {
      return this.listings.filter(l => l.risk_level === 'CRITICAL' || l.risk_level === 'HIGH');
    }
    return [...this.listings];
  }

  async blockListing(id: string): Promise<OnlineSurveillanceItem> {
    const listing = this.listings.find(l => l.id === id);
    if (!listing) throw new Error('Listing not found');
    listing.risk_level = 'CRITICAL';
    listing.flagged_reasons = (listing.flagged_reasons || '') + ' [STATUS: TAKEDOWN NOTICE SERVED]';
    return listing;
  }
}

export const listingService = new ListingService();
export default listingService;
