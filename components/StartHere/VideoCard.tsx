import React, { useState } from 'react';
import { Play, X, Clock } from 'lucide-react';
import type { VideoItem } from './videoConfig';

interface VideoCardProps {
  video: VideoItem;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Check if video has a real YouTube ID (not placeholder)
  const hasRealVideo = video.youtubeId !== 'PLACEHOLDER' && video.youtubeId.length > 5;

  if (isPlaying && hasRealVideo) {
    return (
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        <button
          onClick={() => setIsPlaying(false)}
          className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors duration-150"
        >
          <X size={16} />
        </button>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => hasRealVideo && setIsPlaying(true)}
      disabled={!hasRealVideo}
      className={`w-full text-left bg-white rounded-xl border border-gray-200/60 overflow-hidden group ${
        hasRealVideo
          ? 'hover:shadow-md hover:border-pilot-blue/30 cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      } transition-all duration-150`}
    >
      {/* Thumbnail placeholder */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 ${
            hasRealVideo
              ? 'bg-pilot-blue/90 group-hover:bg-pilot-blue group-hover:scale-110'
              : 'bg-gray-300'
          }`}
        >
          <Play size={24} className="text-white ml-1" />
        </div>
        {!hasRealVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10">
            <span className="bg-gray-800/80 text-white text-xs px-3 py-1.5 rounded-full">
              Coming Soon
            </span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
          <Clock size={12} />
          {video.duration}
        </div>
      </div>

      {/* Video info */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 group-hover:text-pilot-blue transition-colors duration-150">
          {video.title}
        </h4>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{video.description}</p>
      </div>
    </button>
  );
};

export default VideoCard;
