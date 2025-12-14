import { supabase } from '@/infra/supabase/client';

export interface SessionInfo {
    // Session
    sessionId: string;
    sessionStartTime: number;
    deviceId: string;
    sessionNumber: number;
    isFirstSession: boolean;
    
    // Device
    deviceType: 'desktop' | 'mobile' | 'tablet';
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    pixelRatio: number;
    orientation: 'portrait' | 'landscape';
    hasTouchScreen: boolean;
    
    // Browser
    browserName: string;
    browserVersion?: string;
    userAgent: string;
    
    // Platform
    os: string;
    osVersion?: string;
    
    // Additional
    language: string;
    timezone: string;
    connectionType?: string;
    hardwareConcurrency: number;
    appVersion: string;
  }
  
  class SessionManager {
    private static instance: SessionManager;
    private sessionInfo: SessionInfo | null = null;
    private sessionSaved: boolean = false;
    
    private constructor() {
      this.initialize();
    }
    
    static getInstance(): SessionManager {
      if (!SessionManager.instance) {
        SessionManager.instance = new SessionManager();
      }
      return SessionManager.instance;
    }
    
    private initialize(): void {
      console.log('🚀 [SessionManager] Initializing session...');
      
      // Session ID (sessionStorage - reset on tab close)
      const sessionId = sessionStorage.getItem('sessionId') || crypto.randomUUID();
      sessionStorage.setItem('sessionId', sessionId);
      
      // Device ID (localStorage - persistent)
      let deviceId = localStorage.getItem('deviceId');
      const isNewDevice = !deviceId;
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
        console.log('📱 [SessionManager] New device detected, created deviceId:', deviceId);
      }
      
      // Session Number (localStorage)
      const sessionCount = parseInt(localStorage.getItem('sessionCount') || '0', 10);
      const sessionNumber = sessionCount + 1;
      localStorage.setItem('sessionCount', sessionNumber.toString());
      
      if (isNewDevice) {
        console.log('🆕 [SessionManager] First session on this device!');
      } else {
        console.log(`📊 [SessionManager] Session #${sessionNumber} on this device`);
      }
      
      // Device Detection
      const deviceType = this.detectDeviceType();
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Browser Detection
      const { browserName, browserVersion } = this.detectBrowser();
      
      // OS Detection
      const { os, osVersion } = this.detectOS();
      
      // Orientation
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      
      // Connection Type
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const connectionType = connection?.effectiveType;
      
      // App Version (from environment variable or fallback)
      const appVersion = import.meta.env.VITE_APP_VERSION || '0.3.0';
      
      // Viewport dimensions (actual visible area)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Session start time (absolute timestamp in milliseconds)
      const sessionStartTime = Date.now();
      
      this.sessionInfo = {
        sessionId,
        sessionStartTime,
        deviceId,
        sessionNumber,
        isFirstSession: sessionNumber === 1,
        
        deviceType,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth,
        viewportHeight,
        pixelRatio: window.devicePixelRatio || 1,
        orientation,
        hasTouchScreen,
        
        browserName,
        browserVersion,
        userAgent: navigator.userAgent,
        
        os,
        osVersion,
        
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connectionType,
        hardwareConcurrency: navigator.hardwareConcurrency || 1,
        appVersion
      };
      
      console.log('✅ [SessionManager] Session initialized:', {
        sessionId,
        deviceId,
        sessionNumber,
        isFirstSession: sessionNumber === 1,
        deviceType,
        browserName,
        os
      });
      
      // Save session to database (async, non-blocking)
      this.saveSessionToDatabase().catch(error => {
        console.warn('⚠️ [SessionManager] Failed to save session to database:', error);
      });
    }
    
    /**
     * Save session info to Supabase database
     * Called automatically on initialization
     */
    private async saveSessionToDatabase(): Promise<void> {
      if (this.sessionSaved || !this.sessionInfo) {
        return;
      }
      
      console.log('💾 [SessionManager] Attempting to save session to database...');
      
      // Check if Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.log('ℹ️ [SessionManager] Supabase not configured, skipping session save');
        return;
      }
      
      console.log('✅ [SessionManager] Supabase configured, proceeding with save...');
      
      try {
        // Get current user ID (if logged in)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;
        
        if (userId) {
          console.log('👤 [SessionManager] User logged in, userId:', userId);
        } else {
          console.log('👤 [SessionManager] Guest user (not logged in)');
        }
        
        // Convert sessionStartTime (Date.now()) to ISO timestamp
        const sessionStart = new Date(this.sessionInfo.sessionStartTime).toISOString();
        
        const sessionData = {
          session_id: this.sessionInfo.sessionId,
          user_id: userId,
          session_start: sessionStart,
          device_id: this.sessionInfo.deviceId,
          session_number: this.sessionInfo.sessionNumber,
          is_first_session: this.sessionInfo.isFirstSession,
          
          device_type: this.sessionInfo.deviceType,
          screen_width: this.sessionInfo.screenWidth,
          screen_height: this.sessionInfo.screenHeight,
          viewport_width: this.sessionInfo.viewportWidth,
          viewport_height: this.sessionInfo.viewportHeight,
          pixel_ratio: this.sessionInfo.pixelRatio,
          orientation: this.sessionInfo.orientation,
          has_touch: this.sessionInfo.hasTouchScreen,
          
          browser_name: this.sessionInfo.browserName,
          browser_version: this.sessionInfo.browserVersion || null,
          user_agent: this.sessionInfo.userAgent,
          
          os: this.sessionInfo.os,
          os_version: this.sessionInfo.osVersion || null,
          
          language: this.sessionInfo.language,
          timezone: this.sessionInfo.timezone,
          connection_type: this.sessionInfo.connectionType || null,
          hardware_concurrency: this.sessionInfo.hardwareConcurrency,
          
          app_version: this.sessionInfo.appVersion
        };
        
        const { error } = await supabase
          .from('session_info')
          .insert(sessionData);
        
        if (error) {
          // Don't throw - just log, session save is non-critical
          console.error('❌ [SessionManager] Failed to save session:', error.message);
          console.error('   Error details:', error);
          return;
        }
        
        this.sessionSaved = true;
        console.log('✅ [SessionManager] Session successfully saved to database!', {
          sessionId: this.sessionInfo.sessionId,
          userId: userId || 'guest',
          deviceId: this.sessionInfo.deviceId,
          sessionNumber: this.sessionInfo.sessionNumber,
          isFirstSession: this.sessionInfo.isFirstSession
        });
      } catch (error) {
        console.error('❌ [SessionManager] Exception saving session:', error);
        if (error instanceof Error) {
          console.error('   Error message:', error.message);
          console.error('   Stack:', error.stack);
        }
      }
    }
    
    private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
      const width = window.screen.width;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (!hasTouch) return 'desktop';
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }
    
    private detectBrowser(): { browserName: string; browserVersion?: string } {
      const ua = navigator.userAgent.toLowerCase();
      
      if (ua.includes('edg/')) return { browserName: 'edge', browserVersion: ua.match(/edg\/(\d+)/)?.[1] };
      if (ua.includes('chrome/')) return { browserName: 'chrome', browserVersion: ua.match(/chrome\/(\d+)/)?.[1] };
      if (ua.includes('firefox/')) return { browserName: 'firefox', browserVersion: ua.match(/firefox\/(\d+)/)?.[1] };
      if (ua.includes('safari/') && !ua.includes('chrome')) return { browserName: 'safari', browserVersion: ua.match(/version\/(\d+)/)?.[1] };
      
      return { browserName: 'unknown' };
    }
    
    private detectOS(): { os: string; osVersion?: string } {
      const ua = navigator.userAgent;
      
      if (ua.includes('Windows')) {
        const match = ua.match(/Windows NT (\d+\.\d+)/);
        return { os: 'windows', osVersion: match?.[1] };
      }
      if (ua.includes('Mac OS X')) {
        const match = ua.match(/Mac OS X (\d+[._]\d+)/);
        return { os: 'macos', osVersion: match?.[1]?.replace('_', '.') };
      }
      if (ua.includes('Linux')) return { os: 'linux' };
      if (ua.includes('Android')) {
        const match = ua.match(/Android (\d+)/);
        return { os: 'android', osVersion: match?.[1] };
      }
      if (ua.includes('iPhone') || ua.includes('iPad')) {
        const match = ua.match(/OS (\d+[._]\d+)/);
        return { os: 'ios', osVersion: match?.[1]?.replace('_', '.') };
      }
      
      return { os: 'unknown' };
    }
    
    getSessionInfo(): SessionInfo {
      if (!this.sessionInfo) {
        throw new Error('SessionManager not initialized');
      }
      return this.sessionInfo;
    }
    
    getSessionId(): string {
      return this.getSessionInfo().sessionId;
    }
    
    getDeviceId(): string {
      return this.getSessionInfo().deviceId;
    }
  }
  
  export const sessionManager = SessionManager.getInstance();