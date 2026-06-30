import { BookOpen, Heart, MessageSquare } from "lucide-react";

import type { CommunityItem } from "@/data/studio";

import PageContainer from "../PageContainer";
import StudioCard from "../StudioCard";

type CommunityPageProps = {
  communityItems: CommunityItem[];
  onImportCommunityScript: (item: CommunityItem) => void;
  onLikeCommunityItem: (id: string) => void;
};

export default function CommunityPage({
  communityItems,
  onImportCommunityScript,
  onLikeCommunityItem,
}: CommunityPageProps) {
  return (
    <PageContainer className="studio-page-community">
      <div className="w-full p-8">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(336px,1fr))] gap-6">
          {communityItems.map((item) => (
            <StudioCard key={item.id}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">
                    {item.author.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {item.tags.map((tag) => (
                    <span
                      className="px-2.5 py-0.5 bg-[#f3f4f3] text-[10px] text-gray-600 rounded-full font-medium"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {item.description}
              </p>
              <div className="bg-[#fcfcfc] rounded-xl border border-gray-100 p-4 mb-4 flex-1 min-h-0 overflow-y-auto font-mono text-xs text-gray-600 leading-normal whitespace-pre-wrap">
                {item.content}
              </div>
              <div className="flex items-center justify-between border-t border-[#f3f4f3] pt-4 gap-4">
                <div className="flex items-center gap-6">
                  <button
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      item.hasLiked
                        ? "text-brand-secondary"
                        : "text-gray-400 hover:text-brand-secondary"
                    }`}
                    onClick={() => onLikeCommunityItem(item.id)}
                    type="button"
                  >
                    <Heart
                      fill={item.hasLiked ? "currentColor" : "none"}
                      size={15}
                    />
                    <span>{item.likes} 点赞</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MessageSquare size={15} />
                    <span>{item.commentsCount} 讨论</span>
                  </div>
                </div>
                <button
                  className="bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1"
                  onClick={() => onImportCommunityScript(item)}
                  type="button"
                >
                  <BookOpen size={13} />
                  <span>一键导入二次创作</span>
                </button>
              </div>
            </StudioCard>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
