import { TeamActivity } from '../types';
import { getSiteDisplay } from '../services/googleSheets';

/**
 * Exports Tower Space activities to CSV with exact required columns:
 * [No], [NamaUser], [Tanggal], [SiteID-SiteName], [Keterangan]
 */
export function exportTowerSpaceCsv(activities: TeamActivity[]): void {
  const headers = ['No', 'NamaUser', 'Tanggal', 'SiteID-SiteName', 'Keterangan'];

  const rows = activities.map((act, index) => {
    const siteDisplay =
      act.siteId && act.siteName
        ? `${act.siteId} - ${act.siteName}`
        : getSiteDisplay(act);

    const keterangan =
      act.description && act.description !== '-' ? act.description : act.title;

    return [
      index + 1,
      `"${(act.userName || '').replace(/"/g, '""')}"`,
      `"${(act.date || '').replace(/"/g, '""')}"`,
      `"${siteDisplay.replace(/"/g, '""')}"`,
      `"${keterangan.replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `TowerSpace_Export_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
