import React from 'react';

const YouTubeEmbed = ({ url, className = "w-full h-64 md:h-96" }) => {
  if (!url) return null;

  // Convert various YouTube URL formats to embed format
  const getEmbedUrl = (videoUrl) => {
    if (!videoUrl) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
      }
    }
    
    // If already an embed URL, return as is
    if (videoUrl.includes('youtube.com/embed/')) {
      return videoUrl;
    }
    
    return null;
  };

  const embedUrl = getEmbedUrl(url);
  
  if (!embedUrl) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <p className="text-gray-500">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <iframe
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full rounded-lg"
      />
    </div>
  );
};

export default YouTubeEmbed;