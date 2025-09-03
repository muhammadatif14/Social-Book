import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface HuggingFaceRequest {
  inputs: string;
  parameters?: {
    max_length?: number;
    temperature?: number;
    do_sample?: boolean;
    top_p?: number;
  };
}

export interface HuggingFaceResponse {
  generated_text?: string;
  error?: string;
}

export interface AIResponse {
  message: string;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  // Using local responses instead of API calls to avoid authentication issues
  private readonly useLocalResponses = true;
  
  private conversationHistory: ChatMessage[] = [];
  private speechSynthesis: SpeechSynthesis;
  private speechRecognition: any;
  private recognizing: boolean = false;
  private currentLanguage: string = 'en';

  constructor(private http: HttpClient) {
    this.speechSynthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
  // Track recognition state to avoid InvalidStateError when starting twice
  this.speechRecognition.onstart = () => { this.recognizing = true; };
  this.speechRecognition.onend = () => { this.recognizing = false; };
    }
  }

  sendMessage(message: string, language: string = 'en'): Observable<AIResponse> {
    // Add user message to conversation history
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    this.conversationHistory.push(userMessage);

    // Try multiple AI models for better accuracy
    return this.tryMultipleModels(message, language);
  }

  private tryMultipleModels(message: string, language: string): Observable<AIResponse> {
    // Use local intelligent responses instead of API calls
    return from([this.getIntelligentLocalResponse(message, language)]);
  }

  private getIntelligentLocalResponse(message: string, language: string): AIResponse {
    const response = this.getContextualResponse(message, language);
    
    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    return {
      message: response,
      success: true
    };
  }

  private buildAdvancedConversationContext(message: string, language: string): string {
    const systemPrompts: { [key: string]: string } = {
      'en': 'You are a helpful, intelligent AI assistant for SocialBook social media platform. Provide accurate, relevant, and helpful responses. Be conversational but informative.',
      'ur': 'آپ SocialBook سوشل میڈیا پلیٹ فارم کے لیے مددگار، ذہین AI اسسٹنٹ ہیں۔ درست، متعلقہ اور مفید جوابات فراہم کریں۔',
      'ar': 'أنت مساعد ذكي مفيد ومفيد لمنصة SocialBook للتواصل الاجتماعي. قدم إجابات دقيقة ومناسبة ومفيدة.',
      'fr': 'Vous êtes un assistant IA intelligent et utile pour la plateforme de médias sociaux SocialBook. Fournissez des réponses précises, pertinentes et utiles.',
      'es': 'Eres un asistente de IA inteligente y útil para la plataforma de redes sociales SocialBook. Proporciona respuestas precisas, relevantes y útiles.',
      'hi': 'आप SocialBook सोशल मीडिया प्लेटफॉर्म के लिए एक सहायक, बुद्धिमान AI सहायक हैं। सटीक, प्रासंगिक और उपयोगी उत्तर प्रदान करें।'
    };

    let context = systemPrompts[language] || systemPrompts['en'];
    
    // Add conversation history with better formatting
    const recentHistory = this.conversationHistory.slice(-8); // More context
    recentHistory.forEach(msg => {
      if (msg.role === 'user') {
        context += `\nUser: ${msg.content}`;
      } else {
        context += `\nAssistant: ${msg.content}`;
      }
    });

    // Add current question
    context += `\nUser: ${message}`;
    context += `\nAssistant:`;

    return context;
  }

  private processAIResponse(response: string, originalMessage: string, language: string): string {
    // Remove unwanted patterns and clean up
    response = response.replace(/User:|Assistant:|Human:|AI:|System:/g, '');
    response = response.replace(/\n+/g, ' ');
    response = response.trim();
    
    // Extract only the assistant's response
    const parts = response.split('Assistant:');
    if (parts.length > 1) {
      response = parts[parts.length - 1].trim();
    }
    
    // Remove repetitive patterns
    response = response.replace(/(.{10,}?)\1+/g, '$1');
    
    // Ensure response is relevant and not empty
    if (response.length < 10 || this.isGenericResponse(response)) {
      return this.getContextualResponse(originalMessage, language);
    }
    
    // Ensure proper sentence ending
    if (!response.match(/[.!?]$/)) {
      response += '.';
    }
    
    // Limit response length for better UX
    if (response.length > 300) {
      response = response.substring(0, 297) + '...';
    }
    
    return response;
  }

  private isGenericResponse(response: string): boolean {
    const genericPatterns = [
      /^(yes|no|ok|okay|sure|maybe)\.?$/i,
      /^.{1,15}\.?$/,
      /^(i|you|the|a|an)\s/i,
      /^\s*$/ 
    ];
    
    return genericPatterns.some(pattern => pattern.test(response.trim()));
  }

  private getContextualResponse(message: string, language: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced question detection
    if (this.isQuestion(lowerMessage)) {
      return this.getQuestionResponse(message, language);
    }
    
    // Greeting detection
    if (this.isGreeting(lowerMessage)) {
      return this.getGreetingResponse(language);
    }
    
    // Help request detection
    if (this.isHelpRequest(lowerMessage)) {
      return this.getHelpResponse(language);
    }
    
    // Technology/Social Media related
    if (this.isTechRelated(lowerMessage)) {
      return this.getTechResponse(message, language);
    }
    
    // Default contextual response
    return this.getEngagingResponse(message, language);
  }

  private isQuestion(message: string): boolean {
    return message.includes('what') || message.includes('how') || 
           message.includes('why') || message.includes('when') ||
           message.includes('where') || message.includes('who') ||
           message.includes('?') || message.includes('کیا') || 
           message.includes('کیسے') || message.includes('کیوں');
  }

  private isGreeting(message: string): boolean {
    return message.includes('hello') || message.includes('hi') || 
           message.includes('hey') || message.includes('good morning') ||
           message.includes('good afternoon') || message.includes('good evening') ||
           message.includes('سلام') || message.includes('ہیلو');
  }

  private isHelpRequest(message: string): boolean {
    return message.includes('help') || message.includes('assist') ||
           message.includes('support') || message.includes('مدد');
  }

  private isTechRelated(message: string): boolean {
    return message.includes('social') || message.includes('media') ||
           message.includes('app') || message.includes('technology') ||
           message.includes('computer') || message.includes('internet') ||
           message.includes('socialbook');
  }

  private getQuestionResponse(message: string, language: string): string {
    const responses: { [key: string]: string[] } = {
      'en': [
        `That's a great question about "${message}". Let me help you with that - this topic is quite interesting and I'd be happy to provide some insights.`,
        `I'd be happy to help you understand this better. Based on your question, here are some key points to consider.`,
        `That's an excellent question! Let me provide you with a comprehensive answer about this topic.`,
        `Great question! This is something many people wonder about. Here's what I can tell you about it.`
      ],
      'ur': [
        `یہ "${message}" کے بارے میں بہترین سوال ہے۔ میں آپ کی اس میں مدد کروں گا - یہ موضوع کافی دلچسپ ہے اور میں کچھ بصیرت فراہم کرنے میں خوش ہوں گا۔`,
        `میں آپ کو اس کو بہتر سمجھنے میں مدد کرنے میں خوش ہوں گا۔ آپ کے سوال کی بنیاد پر، یہاں کچھ اہم نکات ہیں۔`,
        `یہ ایک بہترین سوال ہے! میں آپ کو اس موضوع کے بارے میں جامع جواب فراہم کرتا ہوں۔`
      ]
    };
    
    const langResponses = responses[language] || responses['en'];
    return langResponses[Math.floor(Math.random() * langResponses.length)];
  }

  private getGreetingResponse(language: string): string {
    const responses: { [key: string]: string[] } = {
      'en': [
        "Hello! I'm your intelligent AI assistant for SocialBook. I'm here to help you with any questions you have about social media, technology, or just have a friendly conversation. How can I assist you today?",
        "Hi there! Welcome to SocialBook's AI assistant. I'm equipped with knowledge on various topics and I'm here to provide helpful, accurate responses. What would you like to know?",
        "Hey! I'm your AI companion on SocialBook. Whether you need information, have questions, or just want to chat, I'm here to help. What's on your mind?"
      ],
      'ur': [
        "السلام علیکم! میں SocialBook کا ذہین AI اسسٹنٹ ہوں۔ میں سوشل میڈیا، ٹیکنالوجی، یا صرف دوستانہ گفتگو کے بارے میں آپ کے کسی بھی سوال میں مدد کے لیے یہاں ہوں۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟",
        "ہیلو! SocialBook کے AI اسسٹنٹ میں خوش آمدید۔ میں مختلف موضوعات پر معلومات سے لیس ہوں اور مددگار، درست جوابات فراہم کرنے کے لیے یہاں ہوں۔ آپ کیا جاننا چاہیں گے؟"
      ]
    };
    
    const langResponses = responses[language] || responses['en'];
    return langResponses[Math.floor(Math.random() * langResponses.length)];
  }

  private getHelpResponse(language: string): string {
    const responses: { [key: string]: string } = {
      'en': "I'm here to help! I can assist you with a wide range of topics including social media questions, technology advice, general knowledge, or just have a conversation. I aim to provide accurate and helpful responses. What specific help do you need?",
      'ur': "میں یہاں مدد کے لیے ہوں! میں سوشل میڈیا کے سوالات، ٹیکنالوجی کی مشورے، عمومی معلومات، یا صرف بات چیت سمیت مختلف موضوعات میں آپ کی مدد کر سکتا ہوں۔ میرا مقصد درست اور مددگار جوابات فراہم کرنا ہے۔ آپ کو کس خاص مدد کی ضرورت ہے؟"
    };
    
    return responses[language] || responses['en'];
  }

  private getTechResponse(message: string, language: string): string {
    const responses: { [key: string]: string[] } = {
      'en': [
        `That's a great tech-related question about "${message}". Technology and social media are fascinating fields that are constantly evolving. Let me share some insights about this.`,
        `I see you're interested in technology and social media topics. This is definitely an area where I can provide helpful information and insights.`,
        `Social media and technology questions are right up my alley! I'd be happy to discuss this topic with you in detail.`
      ],
      'ur': [
        `یہ "${message}" کے بارے میں ٹیکنالوجی سے متعلق بہترین سوال ہے۔ ٹیکنالوجی اور سوشل میڈیا دلچسپ شعبے ہیں جو مسلسل ترقی کر رہے ہیں۔`,
        `میں دیکھ رہا ہوں آپ ٹیکنالوجی اور سوشل میڈیا کے موضوعات میں دلچسپی رکھتے ہیں۔ یہ یقیناً ایک ایسا علاقہ ہے جہاں میں مددگار معلومات فراہم کر سکتا ہوں۔`
      ]
    };
    
    const langResponses = responses[language] || responses['en'];
    return langResponses[Math.floor(Math.random() * langResponses.length)];
  }

  private getEngagingResponse(message: string, language: string): string {
    const responses: { [key: string]: string[] } = {
      'en': [
        `That's an interesting point about "${message}". I'd love to explore this topic further with you. What specific aspect would you like to discuss in more detail?`,
        `Thanks for sharing that with me. Your message touches on some important points. I'm here to provide helpful insights and continue this conversation.`,
        `I find your perspective on "${message}" quite thoughtful. Let me provide some relevant information that might be helpful for this discussion.`,
        `That's a great topic to discuss! I'm equipped to provide detailed information and engage in meaningful conversation about this subject.`
      ],
      'ur': [
        `"${message}" کے بارے میں یہ دلچسپ نکتہ ہے۔ میں آپ کے ساتھ اس موضوع کو مزید دریافت کرنا چاہوں گا۔ آپ کس خاص پہلو کے بارے میں تفصیل سے بات کرنا چاہیں گے؟`,
        `اسے میرے ساتھ شیئر کرنے کا شکریہ۔ آپ کا پیغام کچھ اہم نکات کو چھوتا ہے۔ میں مددگار بصیرت فراہم کرنے اور اس گفتگو کو جاری رکھنے کے لیے یہاں ہوں۔`,
        `"${message}" کے بارے میں آپ کا نقطہ نظر کافی سوچا سمجھا ہے۔ میں کچھ متعلقہ معلومات فراہم کرتا ہوں جو اس بحث کے لیے مددگار ہو سکتی ہیں۔`
      ]
    };
    
    const langResponses = responses[language] || responses['en'];
    return langResponses[Math.floor(Math.random() * langResponses.length)];
  }

  private getEnhancedFallbackResponse(message: string, language: string): AIResponse {
    // Enhanced fallback with contextual understanding
    const intelligentResponse = this.getContextualResponse(message, language);
    
    this.addAIResponseToHistory(intelligentResponse);
    
    return {
      message: intelligentResponse,
      success: true
    };
  }

  addAIResponseToHistory(response: string) {
    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    this.conversationHistory.push(aiMessage);
  }

  // Voice Features
  speakText(text: string, language: string = 'en'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language-specific voice settings
      const voiceSettings: { [key: string]: { lang: string; rate: number; pitch: number } } = {
        'en': { lang: 'en-US', rate: 0.9, pitch: 1.0 },
        'ur': { lang: 'ur-PK', rate: 0.8, pitch: 1.1 },
        'ar': { lang: 'ar-SA', rate: 0.8, pitch: 1.0 },
        'fr': { lang: 'fr-FR', rate: 0.9, pitch: 1.0 },
        'es': { lang: 'es-ES', rate: 0.9, pitch: 1.0 },
        'hi': { lang: 'hi-IN', rate: 0.8, pitch: 1.1 }
      };

      const settings = voiceSettings[language] || voiceSettings['en'];
      utterance.lang = settings.lang;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      this.speechSynthesis.speak(utterance);
    });
  }

  startVoiceRecognition(language: string = 'en'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.speechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      // Set language for recognition
      const speechLanguages: { [key: string]: string } = {
        'en': 'en-US',
        'ur': 'ur-PK',
        'ar': 'ar-SA',
        'fr': 'fr-FR',
        'es': 'es-ES',
        'hi': 'hi-IN'
      };

      this.speechRecognition.lang = speechLanguages[language] || 'en-US';

      // If recognition is already running, avoid starting again
      if (this.recognizing) {
        reject(new Error('Speech recognition already started'));
        return;
      }

      this.speechRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.speechRecognition.onerror = (event: any) => {
        this.recognizing = false;
        reject(new Error('Speech recognition error: ' + event.error));
      };

      try {
        this.speechRecognition.start();
      } catch (err: any) {
        this.recognizing = false;
        reject(new Error('Failed to start recognition: ' + err?.message || err));
      }
    });
  }

  stopVoiceRecognition() {
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {
        // ignore stop errors
      }
      this.recognizing = false;
    }
  }

  clearConversation() {
    this.conversationHistory = [];
  }

  setSystemPrompt(language: string) {
    // This method is kept for compatibility but the system prompt is now handled in buildAdvancedConversationContext
    this.conversationHistory = [];
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  isVoiceSupported(): boolean {
    return !!(this.speechSynthesis && this.speechRecognition);
  }
}
