import { Injectable } from '@angular/core';

export interface Story {
  id: string;
  userId: number;
  username: string;
  profileImage?: string;
  imageUrl: string; // data URL or remote URL
  caption?: string;
  createdAt: string; // ISO string
}

@Injectable({ providedIn: 'root' })
export class StoryService {
  private storageKey = 'socialbook_stories_v1';

  constructor() {}

  getStories(): Story[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as Story[];
    } catch (e) {
      console.error('Failed to read stories from storage', e);
      return [];
    }
  }

  addStory(story: Story): Story {
    const stories = this.getStories();
    stories.unshift(story);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(stories));
    } catch (e) {
      console.error('Failed to save story', e);
    }
    return story;
  }

  deleteStoryById(id: string): boolean {
    try {
      const stories = this.getStories();
      const filtered = stories.filter(s => s.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete story', e);
      return false;
    }
  }

  getStoriesByUser(userId: number): Story[] {
    const stories = this.getStories();
    return stories.filter(s => s.userId === userId);
  }

  clearStories(): void {
    localStorage.removeItem(this.storageKey);
  }
}
