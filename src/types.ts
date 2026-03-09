export interface BundleFeature {
  title: string;
  description: string;
  details: string[];
  icon: string;
}

export const BUNDLE_FEATURES: BundleFeature[] = [
  {
    title: 'Tour Costing Master',
    description: 'Multi-currency budget tracker designed for moving targets. Track per-diems, fuel, and local supplier costs in real-time.',
    details: [
      'Automatic currency conversion for 15+ tour regions',
      'Per-diem calculator for crew and artists',
      'Fuel & Toll tracker for nightliners and splitters',
      'Supplier price history to spot overcharging'
    ],
    icon: 'Calculator'
  },
  {
    title: 'Daily Briefing Sheets',
    description: 'One-page summaries for your team. Covers load-in times, dietary alerts, and venue-specific kitchen constraints.',
    details: [
      'Load-in/Load-out timeline templates',
      'Venue kitchen power & water requirements log',
      'Crew meal count tracker (Lunch/Dinner/Bus stock)',
      'Print-ready PDF and editable Word formats'
    ],
    icon: 'FileText'
  },
  {
    title: 'Dietary Matrix Pro',
    description: 'The "un-fuckup-able" dietary tracker. Automatically flags cross-contamination risks based on your daily menu.',
    details: [
      'Centralized database for crew/artist allergies',
      'Automated menu-to-allergen mapping',
      'Color-coded risk levels for high-pressure service',
      'Exportable "Chef Brief" for sous-chefs and runners'
    ],
    icon: 'ShieldAlert'
  },
  {
    title: 'Mobile Kitchen SOPs',
    description: 'Standard procedures for setting up in flight cases, temporary marquees, and arena loading bays.',
    details: [
      'Flight case packing diagrams and inventory',
      'Temporary kitchen health & safety protocols',
      'Gas & Electric safety checklists for touring',
      'Emergency procedure templates for remote sites'
    ],
    icon: 'Truck'
  },
  {
    title: 'Supplier Database Template',
    description: 'Pre-formatted for international tours. Store contacts for wholesalers, gas suppliers, and equipment hire globally.',
    details: [
      'Categorized by city and venue proximity',
      'Rating system for local wholesalers',
      'Credit account application tracker',
      'Emergency contact list for equipment repair'
    ],
    icon: 'Globe'
  },
  {
    title: 'Load-In/Out Checklists',
    description: 'Never leave a Vitamix behind again. Comprehensive lists for the most chaotic part of the day.',
    details: [
      'Itemized equipment lists by flight case',
      'Power down and gas isolation protocols',
      'Bus stock and dressing room sweep lists',
      'Loading bay priority and truck pack guides'
    ],
    icon: 'ClipboardCheck'
  }
];

export const BUNDLE_PRICE = 29;
export const BUNDLE_ORIGINAL_PRICE = 49;
