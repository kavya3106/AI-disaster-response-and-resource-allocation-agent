import { AppStats } from '../types.js';
import { AlertTriangle, Shield, Clock, HardHat, FileText, CheckCircle } from 'lucide-react';

interface StatsBarProps {
  stats: AppStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const cards = [
    {
      id: 'stat-total-incidents',
      title: 'Total Incidents',
      value: stats.totalIncidents,
      subtitle: `${stats.pendingIncidents} pending / ${stats.activeIncidents} active`,
      icon: AlertTriangle,
      color: 'text-amber-500 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    },
    {
      id: 'stat-active-deployments',
      title: 'Active Deployments',
      value: stats.deployedResources,
      subtitle: `Out of ${stats.totalResources} total units`,
      icon: HardHat,
      color: 'text-sky-500 hover:border-sky-500/40 hover:shadow-[0_0_15px_rgba(56,189,248,0.15)]',
    },
    {
      id: 'stat-unmet-needs',
      title: 'Unmet Resource Need',
      value: stats.unmetNeedCount,
      subtitle: stats.unmetNeedCount > 0 ? 'Urgent reinforcement needed' : 'All demands satisfied',
      icon: Shield,
      color: stats.unmetNeedCount > 0 
        ? 'text-rose-500 border-rose-500/30 animate-pulse hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
        : 'text-emerald-500 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]',
    },
    {
      id: 'stat-response-eta',
      title: 'Avg Response ETA',
      value: `${stats.avgResponseEta}m`,
      subtitle: 'Includes 10m prep time',
      icon: Clock,
      color: 'text-indigo-500 hover:border-indigo-500/40 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    },
    {
      id: 'stat-resolved-tasks',
      title: 'Resolved Tasks',
      value: stats.resolvedIncidents,
      subtitle: 'Incidents fully mitigated',
      icon: CheckCircle,
      color: 'text-emerald-500 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]',
    }
  ];

  return (
    <div id="stats-container" className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`p-4 rounded-xl bento-card flex items-center gap-4 transition-all hover:scale-[1.02] ${card.color}`}
          >
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-mono font-bold tracking-tight text-white mt-0.5">{card.value}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
