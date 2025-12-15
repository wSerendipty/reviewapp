import { openDB } from 'idb';
import type { Question, ExamRecord, ReviewProgress } from '../../types';

const DB_NAME = 'ReviewAppDB';
const DB_VERSION = 2;
const QUESTIONS_STORE = 'questions';
const EXAM_RECORDS_STORE = 'examRecords';
const REVIEW_PROGRESS_STORE = 'reviewProgress';

// 打开数据库
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // 创建题目存储
    if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
      const questionsStore = db.createObjectStore(QUESTIONS_STORE, { keyPath: 'id', autoIncrement: true });
      questionsStore.createIndex('type', 'type');
      questionsStore.createIndex('category', 'category');
      questionsStore.createIndex('difficulty', 'difficulty');
      questionsStore.createIndex('isMarked', 'isMarked');
      questionsStore.createIndex('isWrong', 'isWrong');
    }
    
    // 创建考试记录存储
    if (!db.objectStoreNames.contains(EXAM_RECORDS_STORE)) {
      const examRecordsStore = db.createObjectStore(EXAM_RECORDS_STORE, { keyPath: 'id', autoIncrement: true });
      examRecordsStore.createIndex('createdAt', 'createdAt');
    }
    
    // 创建背题进度存储
    if (!db.objectStoreNames.contains(REVIEW_PROGRESS_STORE)) {
      // 使用固定key，只保存一条进度记录
      const progressStore = db.createObjectStore(REVIEW_PROGRESS_STORE, { keyPath: 'id', autoIncrement: false });
      progressStore.put({ id: 1 });
    }
  },
});

// 题目相关操作
export const questionDB = {
  // 获取所有题目
  async getAll(): Promise<Question[]> {
    const db = await dbPromise;
    return db.getAll(QUESTIONS_STORE);
  },
  
  // 根据ID获取题目
  async getById(id: number): Promise<Question | undefined> {
    const db = await dbPromise;
    return db.get(QUESTIONS_STORE, id);
  },
  
  // 添加题目
  async add(question: Omit<Question, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const id = await db.add(QUESTIONS_STORE, {
      ...question,
      createdAt: new Date(),
    });
    return id as number;
  },
  
  // 批量添加题目
  async bulkAdd(questions: Omit<Question, 'id' | 'createdAt'>[]): Promise<number[]> {
    const db = await dbPromise;
    const tx = db.transaction(QUESTIONS_STORE, 'readwrite');
    const store = tx.objectStore(QUESTIONS_STORE);
    
    const promises = questions.map(q => store.add({
      ...q,
      createdAt: new Date(),
    }));
    
    const results = await Promise.all(promises);
    await tx.done;
    return results as number[];
  },
  
  // 更新题目
  async update(question: Question): Promise<void> {
    const db = await dbPromise;
    await db.put(QUESTIONS_STORE, question);
  },
  
  // 删除题目
  async delete(id: number): Promise<void> {
    const db = await dbPromise;
    await db.delete(QUESTIONS_STORE, id);
  },
  
  // 批量删除题目
  async bulkDelete(ids: number[]): Promise<void> {
    const db = await dbPromise;
    const tx = db.transaction(QUESTIONS_STORE, 'readwrite');
    const store = tx.objectStore(QUESTIONS_STORE);
    
    for (const id of ids) {
      await store.delete(id);
    }
    
    await tx.done;
  },
  
  // 按条件查询题目
  async query(params: {
    type?: string;
    category?: string;
    difficulty?: number;
    isMarked?: boolean;
    isWrong?: boolean;
  }): Promise<Question[]> {
    const db = await dbPromise;
    let results: Question[];
    
    if (params.type) {
      results = await db.getAllFromIndex(QUESTIONS_STORE, 'type', params.type);
    } else if (params.category) {
      results = await db.getAllFromIndex(QUESTIONS_STORE, 'category', params.category);
    } else {
      results = await db.getAll(QUESTIONS_STORE);
    }
    
    // 进一步过滤
    return results.filter(q => {
      if (params.difficulty !== undefined && q.difficulty !== params.difficulty) return false;
      if (params.isMarked !== undefined && q.isMarked !== params.isMarked) return false;
      if (params.isWrong !== undefined && q.isWrong !== params.isWrong) return false;
      return true;
    });
  },
  
  // 统计题目数量
  async count(): Promise<number> {
    const db = await dbPromise;
    return db.count(QUESTIONS_STORE);
  },
};

// 考试记录相关操作
export const examRecordDB = {
  // 获取所有考试记录
  async getAll(): Promise<ExamRecord[]> {
    const db = await dbPromise;
    return db.getAll(EXAM_RECORDS_STORE);
  },
  
  // 添加考试记录
  async add(record: Omit<ExamRecord, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const id = await db.add(EXAM_RECORDS_STORE, {
      ...record,
      createdAt: new Date(),
    });
    return id as number;
  },
  
  // 删除考试记录
  async delete(id: number): Promise<void> {
    const db = await dbPromise;
    await db.delete(EXAM_RECORDS_STORE, id);
  },
  
  // 清空考试记录
  async clear(): Promise<void> {
    const db = await dbPromise;
    await db.clear(EXAM_RECORDS_STORE);
  },
};

// 背题进度相关操作
export const reviewProgressDB = {
  // 保存背题进度
  async saveProgress(progress: Omit<ReviewProgress, 'updatedAt'>): Promise<void> {
    const db = await dbPromise;
    await db.put(REVIEW_PROGRESS_STORE, {
      id: 1,
      ...progress,
      updatedAt: new Date(),
    });
  },
  
  // 获取背题进度
  async getProgress(): Promise<ReviewProgress | undefined> {
    const db = await dbPromise;
    return db.get(REVIEW_PROGRESS_STORE, 1);
  },
  
  // 清除背题进度
  async clearProgress(): Promise<void> {
    const db = await dbPromise;
    await db.delete(REVIEW_PROGRESS_STORE, 1);
  },
};
