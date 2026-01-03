import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Rocket, Users, Zap, PieChart, Settings } from 'lucide-react';
import VideoCard from './VideoCard';
import { VIDEO_CATEGORIES, type VideoCategory } from './videoConfig';

// Map category IDs to icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'getting-started': <Rocket size={18} />,
  'managing-leads': <Users size={18} />,
  'outreach-workflow': <Zap size={18} />,
  'tracking-results': <PieChart size={18} />,
  'settings': <Settings size={18} />,
};

interface CategorySectionProps {
  category: VideoCategory;
  isExpanded: boolean;
  onToggle: () => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isExpanded,
  onToggle,
}) => {
  const icon = CATEGORY_ICONS[category.id] || <Rocket size={18} />;

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors duration-150"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-pilot-blue/10 rounded-lg flex items-center justify-center text-pilot-blue">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{category.title}</h3>
            <p className="text-sm text-gray-500">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {category.videos.length} video{category.videos.length !== 1 ? 's' : ''}
          </span>
          {isExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const VideoSection: React.FC = () => {
  // First category expanded by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const firstId = VIDEO_CATEGORIES[0]?.id;
    return firstId ? new Set([firstId]) : new Set();
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">
          Feature Walkthroughs
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Video tutorials for every part of Outbound Pilot
        </p>
      </div>

      <div className="space-y-4">
        {VIDEO_CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoSection;
