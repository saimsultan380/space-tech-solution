declare module "zklib-js" {
  export default class ZKLib {
    constructor(ip: string, port: number, timeout: number, inport: number);
    
    createSocket(): Promise<boolean>;
    disconnect(): Promise<void>;
    getAttendances(): Promise<{ data: Array<{
      deviceUserId: string;
      recordTime: Date;
      ip: string;
    }> }>;
    getUsers(): Promise<{ data: Array<any> }>;
    getInfo(): Promise<any>;
    clearAttendanceLog(): Promise<void>;
  }
}
