import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const algorithmInfo = {
  bubble: {
    name: '冒泡排序',
    icon: '🫧',
    description: '每轮比较相邻元素，将最大值"冒泡"到末尾',
    complexity: 'O(n²)',
    color: 'var(--status-success-fg)',
  },
  insertion: {
    name: '插入排序',
    icon: '🃏',
    description: '像整理扑克牌，将元素插入到已排序部分的正确位置',
    complexity: 'O(n²)',
    color: 'var(--brand-primary)',
  },
  merge: {
    name: '归并排序',
    icon: '🔀',
    description: '分治思想：分解 → 递归排序 → 合并有序数组',
    complexity: 'O(n log n)',
    color: 'var(--status-warn-fg)',
  },
  quick: {
    name: '快速排序',
    icon: '⚡',
    description: '选基准分区，小的放左边，大的放右边，递归处理',
    complexity: 'O(n log n)',
    color: 'var(--brand-accent)',
  },
  heap: {
    name: '堆排序',
    icon: '🏔️',
    description: '利用堆的性质，反复取出堆顶最大值',
    complexity: 'O(n log n)',
    color: 'var(--status-info-fg)',
  },
}


function Visualizer() {
  const { type } = useParams()
  const [array, setArray] = useState([])
  const [sorting, setSorting] = useState(false)
  const [comparing, setComparing] = useState([])
  const [sorted, setSorted] = useState([])
  const [pivot, setPivot] = useState(-1)
  const [highlight, setHighlight] = useState([])
  const [speed, setSpeed] = useState(50)
  const [stepInfo, setStepInfo] = useState({ title: '准备就绪', desc: '点击"开始排序"查看动画演示' })
  const sortingRef = useRef(false)
  
  const info = algorithmInfo[type] || algorithmInfo.bubble
  
  // 生成随机数组
  const generateArray = useCallback(() => {
    const newArray = Array.from({ length: 10 }, () => Math.floor(Math.random() * 70) + 15)
    setArray(newArray)
    setSorted([])
    setComparing([])
    setPivot(-1)
    setHighlight([])
    setStepInfo({ title: '新数组已生成', desc: '点击"开始排序"查看动画演示' })
  }, [])
  
  useEffect(() => {
    generateArray()
    sortingRef.current = false
  }, [generateArray, type])
  
  // 延迟函数
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  
  // 获取延迟时间
  const getDelay = () => Math.max(50, 600 - speed * 5)
  
  // ==================== 冒泡排序 ====================
  const bubbleSort = async () => {
    let arr = [...array]
    const n = arr.length
    
    for (let i = 0; i < n - 1; i++) {
      if (!sortingRef.current) return
      
      for (let j = 0; j < n - 1 - i; j++) {
        if (!sortingRef.current) return
        
        setComparing([j, j + 1])
        setStepInfo({ 
          title: `第 ${i + 1} 轮 · 比较位置 ${j} 和 ${j + 1}`,
          desc: `${arr[j]} ${arr[j] > arr[j + 1] ? '>' : '≤'} ${arr[j + 1]}${arr[j] > arr[j + 1] ? ' → 交换' : ' → 不交换'}`
        })
        await sleep(getDelay())
        
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
          setArray([...arr])
          await sleep(getDelay() / 2)
        }
      }
      setSorted(prev => [...prev, n - 1 - i])
    }
    
    setSorted(Array.from({ length: n }, (_, i) => i))
    setComparing([])
    setStepInfo({ title: '✨ 排序完成！', desc: '数组已按升序排列' })
  }
  
  // ==================== 插入排序 ====================
  const insertionSort = async () => {
    let arr = [...array]
    const n = arr.length
    
    setSorted([0])
    setStepInfo({ title: '初始化', desc: '第一个元素视为已排序' })
    await sleep(getDelay())
    
    for (let i = 1; i < n; i++) {
      if (!sortingRef.current) return
      
      const key = arr[i]
      let j = i - 1
      
      setHighlight([i])
      setStepInfo({ 
        title: `插入第 ${i + 1} 个元素: ${key}`,
        desc: '将其插入到已排序部分的正确位置'
      })
      await sleep(getDelay())
      
      while (j >= 0 && arr[j] > key) {
        if (!sortingRef.current) return
        
        setComparing([j, j + 1])
        await sleep(getDelay() / 2)
        
        arr[j + 1] = arr[j]
        setArray([...arr])
        j--
      }
      
      arr[j + 1] = key
      setArray([...arr])
      setSorted(prev => {
        const newSorted = [...prev]
        if (!newSorted.includes(i)) newSorted.push(i)
        return newSorted.sort((a, b) => a - b)
      })
      setHighlight([])
      await sleep(getDelay() / 2)
    }
    
    setSorted(Array.from({ length: n }, (_, i) => i))
    setComparing([])
    setHighlight([])
    setStepInfo({ title: '✨ 排序完成！', desc: '数组已按升序排列' })
  }
  
  // ==================== 归并排序 ====================
  const mergeSort = async () => {
    let arr = [...array]
    
    const merge = async (l, mid, r) => {
      if (!sortingRef.current) return
      
      const left = arr.slice(l, mid + 1)
      const right = arr.slice(mid + 1, r + 1)
      
      setStepInfo({ 
        title: `合并区间 [${l}, ${mid}] 和 [${mid + 1}, ${r}]`,
        desc: '将两个有序部分合并'
      })
      
      let i = 0, j = 0, k = l
      
      while (i < left.length && j < right.length) {
        if (!sortingRef.current) return
        
        setComparing([l + i, mid + 1 + j])
        await sleep(getDelay())
        
        if (left[i] <= right[j]) {
          arr[k] = left[i]
          i++
        } else {
          arr[k] = right[j]
          j++
        }
        setArray([...arr])
        k++
      }
      
      while (i < left.length) {
        arr[k] = left[i]
        setArray([...arr])
        i++; k++
        await sleep(getDelay() / 3)
      }
      
      while (j < right.length) {
        arr[k] = right[j]
        setArray([...arr])
        j++; k++
        await sleep(getDelay() / 3)
      }
      
      // 标记这部分为已排序
      for (let x = l; x <= r; x++) {
        if (!sorted.includes(x)) {
          setSorted(prev => [...prev, x])
        }
      }
    }
    
    const sort = async (l, r) => {
      if (!sortingRef.current) return
      if (l >= r) return
      
      const mid = Math.floor((l + r) / 2)
      
      setStepInfo({ 
        title: `分解区间 [${l}, ${r}]`,
        desc: `分成 [${l}, ${mid}] 和 [${mid + 1}, ${r}]`
      })
      setHighlight(Array.from({ length: r - l + 1 }, (_, i) => l + i))
      await sleep(getDelay())
      
      await sort(l, mid)
      await sort(mid + 1, r)
      await merge(l, mid, r)
    }
    
    await sort(0, arr.length - 1)
    
    setSorted(Array.from({ length: arr.length }, (_, i) => i))
    setComparing([])
    setHighlight([])
    setStepInfo({ title: '✨ 排序完成！', desc: '数组已按升序排列' })
  }
  
  // ==================== 快速排序 ====================
  const quickSort = async () => {
    let arr = [...array]
    
    const partition = async (low, high) => {
      if (!sortingRef.current) return low
      
      const pivotVal = arr[high]
      setPivot(high)
      setStepInfo({ 
        title: `选择基准值: ${pivotVal}`,
        desc: `小于 ${pivotVal} 的放左边，大于的放右边`
      })
      await sleep(getDelay())
      
      let i = low - 1
      
      for (let j = low; j < high; j++) {
        if (!sortingRef.current) return low
        
        setComparing([j, high])
        await sleep(getDelay() / 2)
        
        if (arr[j] < pivotVal) {
          i++
          if (i !== j) {
            [arr[i], arr[j]] = [arr[j], arr[i]]
            setArray([...arr])
            await sleep(getDelay() / 2)
          }
        }
      }
      
      ;[arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
      setArray([...arr])
      setSorted(prev => [...prev, i + 1])
      setPivot(-1)
      
      return i + 1
    }
    
    const sort = async (low, high) => {
      if (!sortingRef.current) return
      if (low < high) {
        setHighlight(Array.from({ length: high - low + 1 }, (_, i) => low + i))
        const pi = await partition(low, high)
        await sort(low, pi - 1)
        await sort(pi + 1, high)
      } else if (low === high) {
        setSorted(prev => [...prev, low])
      }
    }
    
    await sort(0, arr.length - 1)
    
    setSorted(Array.from({ length: arr.length }, (_, i) => i))
    setPivot(-1)
    setComparing([])
    setHighlight([])
    setStepInfo({ title: '✨ 排序完成！', desc: '数组已按升序排列' })
  }
  
  // ==================== 堆排序 ====================
  const heapSort = async () => {
    let arr = [...array]
    const n = arr.length
    
    const siftDown = async (i, heapSize) => {
      if (!sortingRef.current) return
      
      let largest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      
      if (left < heapSize) {
        setComparing([i, left])
        await sleep(getDelay() / 2)
        if (arr[left] > arr[largest]) largest = left
      }
      
      if (right < heapSize) {
        setComparing([largest, right])
        await sleep(getDelay() / 2)
        if (arr[right] > arr[largest]) largest = right
      }
      
      if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]]
        setArray([...arr])
        await sleep(getDelay() / 2)
        await siftDown(largest, heapSize)
      }
    }
    
    // 建堆
    setStepInfo({ title: '阶段 1: 建堆', desc: '将数组调整为大顶堆' })
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      if (!sortingRef.current) return
      setHighlight([i])
      await siftDown(i, n)
    }
    
    // 排序
    setStepInfo({ title: '阶段 2: 排序', desc: '反复取出堆顶最大值' })
    for (let i = n - 1; i > 0; i--) {
      if (!sortingRef.current) return
      
      setComparing([0, i])
      await sleep(getDelay() / 2)
      
      ;[arr[0], arr[i]] = [arr[i], arr[0]]
      setArray([...arr])
      setSorted(prev => [...prev, i])
      
      await siftDown(0, i)
    }
    
    setSorted(Array.from({ length: n }, (_, i) => i))
    setComparing([])
    setHighlight([])
    setStepInfo({ title: '✨ 排序完成！', desc: '数组已按升序排列' })
  }
  
  // 开始排序
  const startSort = async () => {
    sortingRef.current = true
    setSorting(true)
    setSorted([])
    setComparing([])
    setHighlight([])
    
    switch (type) {
      case 'bubble': await bubbleSort(); break
      case 'insertion': await insertionSort(); break
      case 'merge': await mergeSort(); break
      case 'quick': await quickSort(); break
      case 'heap': await heapSort(); break
      default: await bubbleSort()
    }
    
    setSorting(false)
    sortingRef.current = false
  }
  
  // 停止排序
  const stopSort = () => {
    sortingRef.current = false
    setSorting(false)
    setStepInfo({ title: '已停止', desc: '点击"重置"生成新数组' })
  }
  
  const algorithms = ['bubble', 'insertion', 'merge', 'quick', 'heap']
  
  return (
    <motion.div 
      className="visualizer-container"
      style={{ '--algo-accent': info.color }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="visualizer-header">
        <Link to="/" style={{ color: 'var(--text-muted)', marginBottom: '20px', display: 'inline-block', fontFamily: 'var(--font-mono)' }}>
          ← 返回课程列表
        </Link>
        <h1 className="visualizer-title">
          <span>{info.icon}</span>
          {info.name}
        </h1>
        <p className="visualizer-desc">{info.description}</p>
        <div className="complexity-badge">时间复杂度: {info.complexity}</div>
      </div>
      
      <div className="step-info">
        <h4>{stepInfo.title}</h4>
        <p>{stepInfo.desc}</p>
      </div>
      
      <div className="visualizer-canvas">
        <div className="array-container">
          <AnimatePresence mode="popLayout">
            {array.map((value, index) => (
              <motion.div 
                key={index}
                className="array-bar"
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <motion.div
                  className={`bar ${comparing.includes(index) ? 'comparing' : ''} ${sorted.includes(index) ? 'sorted' : ''} ${pivot === index ? 'pivot' : ''} ${highlight.includes(index) ? 'highlight' : ''}`}
                  style={{ height: `${value * 3.5}px` }}
                  animate={{
                    scale: comparing.includes(index) ? 1.1 : 1,
                    transition: { duration: 0.15 }
                  }}
                >
                  {value}
                </motion.div>
                <span className="bar-index">{index}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="controls">
        <button 
          className="control-btn primary"
          onClick={startSort}
          disabled={sorting}
        >
          {sorting ? '⏳ 排序中...' : '▶ 开始排序'}
        </button>
        
        <button 
          className="control-btn secondary"
          onClick={stopSort}
          disabled={!sorting}
        >
          ⏹ 停止
        </button>
        
        <button 
          className="control-btn secondary"
          onClick={generateArray}
          disabled={sorting}
        >
          🔄 重置
        </button>
        
        <div className="speed-control">
          <label>速度</label>
          <input 
            type="range" 
            className="speed-slider"
            min="10" 
            max="100" 
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
          />
        </div>
      </div>
      
      <div className="algo-switcher">
        {algorithms.map((algo) => (
          <Link 
            key={algo}
            to={`/visualizer/${algo}`}
            className={`algo-btn ${type === algo ? 'active' : ''}`}
          >
            {algorithmInfo[algo].icon} {algorithmInfo[algo].name}
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

export default Visualizer
