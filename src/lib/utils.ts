import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 北京时区相关的时间处理工具函数
export const timeUtils = {
  // 将datetime-local的值转换为北京时间的ISO字符串（用于保存到数据库）
  localToBeijingISO: (datetimeLocalValue: string): string => {
    if (!datetimeLocalValue) return '';
    // datetime-local返回的是不带时区的本地时间，我们将其视为北京时间
    // 需要明确地将其解释为北京时间（UTC+8），然后转换为UTC时间存储
    
    // 解析日期时间字符串
    const [datePart, timePart] = datetimeLocalValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // 创建一个UTC Date对象，表示北京时间减去8小时后的UTC时间
    // 即：用户输入的时间作为北京时间，对应的UTC时间是减去8小时
    const utcTime = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    
    return utcTime.toISOString();
  },

  // 将数据库中的UTC时间转换为datetime-local输入框需要的格式
  beijingISOToLocal: (isoString: string): string => {
    if (!isoString) return '';
    // 将UTC时间转换为北京时间（UTC+8），然后格式化为datetime-local格式
    const utcTime = new Date(isoString);
    const beijingTime = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString().slice(0, 16);
  },

  // 格式化显示北京时间
  formatBeijingTime: (isoString: string): string => {
    if (!isoString) return '';
    // 直接使用时区转换显示北京时间，避免重复转换
    const utcTime = new Date(isoString);
    
    return utcTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
  },

  // 简短的日期格式
  formatBeijingTimeShort: (isoString: string): string => {
    if (!isoString) return '';
    const utcTime = new Date(isoString);
    
    return utcTime.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
  }
}
