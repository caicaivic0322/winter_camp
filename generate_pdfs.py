#!/usr/bin/env python3
"""
C++ 课程讲义和测试卷 PDF 生成器
================================
将 Markdown 格式的讲义和测试卷转换为精美排版的 PDF 文档

依赖安装：
pip install reportlab
"""

import os
import re
import glob
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Preformatted, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from xml.sax.saxutils import escape as xml_escape

# 全局字体变量
CHINESE_FONT = 'Helvetica'
CHINESE_FONT_BOLD = 'Helvetica-Bold'
CODE_FONT = 'Courier'

def register_chinese_fonts():
    """注册中文字体，支持多种系统"""
    global CHINESE_FONT, CHINESE_FONT_BOLD, CODE_FONT
    
    # 中文字体优先级列表（正文用）
    body_fonts = [
        # Hiragino Sans GB - 非常美观的简体中文字体
        ('/System/Library/Fonts/Hiragino Sans GB.ttc', 'HiraginoSansGB', 0),
        # STHeiti - 黑体，清晰易读
        ('/System/Library/Fonts/STHeiti Medium.ttc', 'STHeiti-Medium', 0),
        ('/System/Library/Fonts/STHeiti Light.ttc', 'STHeiti-Light', 0),
        # 宋体
        ('/System/Library/Fonts/Supplemental/Songti.ttc', 'Songti', 0),
    ]
    
    # 代码用字体（需要支持中文）
    code_fonts = [
        # 使用 Hiragino Sans GB 作为代码字体备选（因为它支持中文）
        ('/System/Library/Fonts/Hiragino Sans GB.ttc', 'HiraginoCode', 0),
        ('/System/Library/Fonts/STHeiti Light.ttc', 'STCode', 0),
        # Menlo 等宽字体（不支持中文，但可以作为英文代码备选）
        ('/System/Library/Fonts/Menlo.ttc', 'Menlo', 0),
    ]
    
    # 注册正文字体
    for font_path, font_name, font_index in body_fonts:
        if os.path.exists(font_path):
            try:
                if font_path.endswith('.ttc'):
                    pdfmetrics.registerFont(TTFont(font_name, font_path, subfontIndex=font_index))
                else:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                CHINESE_FONT = font_name
                CHINESE_FONT_BOLD = font_name  # TTC 字体通常没有单独的粗体文件
                print(f"✓ 正文字体注册成功: {font_name}")
                break
            except Exception as e:
                print(f"× 注册正文字体失败 {font_name}: {e}")
                continue
    
    # 注册代码字体（需要支持中文注释）
    for font_path, font_name, font_index in code_fonts:
        if os.path.exists(font_path):
            try:
                if font_path.endswith('.ttc'):
                    pdfmetrics.registerFont(TTFont(font_name, font_path, subfontIndex=font_index))
                else:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                CODE_FONT = font_name
                print(f"✓ 代码字体注册成功: {font_name}")
                break
            except Exception as e:
                print(f"× 注册代码字体失败 {font_name}: {e}")
                continue
    
    return CHINESE_FONT

# 定义颜色方案
class ColorScheme:
    PRIMARY = colors.HexColor('#2563eb')       # 蓝色主色
    SECONDARY = colors.HexColor('#7c3aed')     # 紫色
    SUCCESS = colors.HexColor('#059669')       # 绿色
    WARNING = colors.HexColor('#d97706')       # 橙色
    DANGER = colors.HexColor('#dc2626')        # 红色
    DARK = colors.HexColor('#1f2937')          # 深灰
    MUTED = colors.HexColor('#6b7280')         # 灰色
    LIGHT = colors.HexColor('#f3f4f6')         # 浅灰
    WHITE = colors.white
    CODE_BG = colors.HexColor('#1e293b')       # 代码背景
    CODE_TEXT = colors.HexColor('#e2e8f0')     # 代码文字
    CODE_COMMENT = colors.HexColor('#94a3b8')  # 代码注释颜色
    CODE_KEYWORD = colors.HexColor('#f472b6')  # 关键字颜色
    CODE_STRING = colors.HexColor('#a5f3fc')   # 字符串颜色
    HEADER_BG = colors.HexColor('#3b82f6')     # 标题背景

# 最大代码块行数（超过此行数自动分页）
MAX_CODE_LINES = 35

class CodeBlock(Flowable):
    """自定义代码块流对象 - 支持中文"""
    def __init__(self, code, language='cpp', width=None):
        Flowable.__init__(self)
        self.code = code
        self.language = language
        self.width = width or (A4[0] - 50*mm)
        self.padding = 10
        self.line_height = 13
        
    def wrap(self, availWidth, availHeight):
        lines = self.code.split('\n')
        self.height = len(lines) * self.line_height + self.padding * 2 + 10
        return (min(self.width, availWidth), self.height)
        
    def draw(self):
        # 绘制背景
        self.canv.setFillColor(ColorScheme.CODE_BG)
        self.canv.roundRect(0, 0, self.width, self.height, 5, fill=1, stroke=0)
        
        # 绘制语言标签
        if self.language:
            self.canv.setFillColor(ColorScheme.PRIMARY)
            self.canv.roundRect(self.width - 50, self.height - 18, 45, 14, 3, fill=1, stroke=0)
            self.canv.setFillColor(colors.white)
            self.canv.setFont('Helvetica-Bold', 7)
            self.canv.drawString(self.width - 45, self.height - 14, self.language[:6])
        
        # 绘制代码 - 使用支持中文的字体
        lines = self.code.split('\n')
        y = self.height - self.padding - 15
        
        for i, line in enumerate(lines):
            # 行号 - 使用等宽字体
            self.canv.setFillColor(ColorScheme.MUTED)
            self.canv.setFont('Courier', 8)
            self.canv.drawString(self.padding, y, f'{i+1:3}')
            
            # 代码内容 - 使用支持中文的字体
            self.canv.setFont(CODE_FONT, 10)
            
            # 检测是否包含中文注释
            if '//' in line:
                # 分割代码和注释
                parts = line.split('//', 1)
                code_part = parts[0]
                comment_part = '//' + parts[1] if len(parts) > 1 else ''
                
                # 绘制代码部分
                self.canv.setFillColor(ColorScheme.CODE_TEXT)
                self.canv.drawString(self.padding + 28, y, code_part[:50])
                
                # 绘制注释部分（不同颜色）
                if comment_part:
                    code_width = self.canv.stringWidth(code_part[:50], CODE_FONT, 10)
                    self.canv.setFillColor(ColorScheme.CODE_COMMENT)
                    self.canv.drawString(self.padding + 28 + code_width, y, comment_part[:30])
            else:
                # 普通代码行
                self.canv.setFillColor(ColorScheme.CODE_TEXT)
                # 限制宽度，避免溢出
                display_line = line[:70]
                self.canv.drawString(self.padding + 28, y, display_line)
            
            y -= self.line_height

class TipBox(Flowable):
    """提示框流对象"""
    def __init__(self, text, tip_type='info', width=None):
        Flowable.__init__(self)
        self.text = text
        self.tip_type = tip_type
        self.width = width or (A4[0] - 50*mm)
        
        # 根据类型设置颜色
        self.colors = {
            'info': (ColorScheme.PRIMARY, colors.HexColor('#dbeafe')),
            'success': (ColorScheme.SUCCESS, colors.HexColor('#d1fae5')),
            'warning': (ColorScheme.WARNING, colors.HexColor('#fef3c7')),
            'danger': (ColorScheme.DANGER, colors.HexColor('#fee2e2')),
        }
        
    def wrap(self, availWidth, availHeight):
        # 估算高度
        lines = len(self.text) // 60 + 1
        self.height = max(40, lines * 18 + 20)
        return (self.width, self.height)
        
    def draw(self):
        border_color, bg_color = self.colors.get(self.tip_type, self.colors['info'])
        
        # 背景
        self.canv.setFillColor(bg_color)
        self.canv.roundRect(0, 0, self.width, self.height, 5, fill=1, stroke=0)
        
        # 左边框
        self.canv.setFillColor(border_color)
        self.canv.rect(0, 0, 4, self.height, fill=1, stroke=0)
        
        # 文字
        self.canv.setFillColor(ColorScheme.DARK)
        self.canv.setFont(CHINESE_FONT, 11)
        
        # 简单换行处理
        words = self.text.split()
        lines = []
        current_line = []
        for word in words:
            current_line.append(word)
            if len(' '.join(current_line)) > 70:
                lines.append(' '.join(current_line[:-1]))
                current_line = [word]
        lines.append(' '.join(current_line))
        
        y = self.height - 20
        for line in lines:
            self.canv.drawString(15, y, line)
            y -= 16

def create_styles(font_name='Helvetica'):
    """创建自定义样式"""
    styles = getSampleStyleSheet()
    
    # 标题样式
    styles.add(ParagraphStyle(
        name='CustomTitle',
        fontName=font_name,
        fontSize=28,
        leading=36,
        alignment=TA_CENTER,
        textColor=ColorScheme.PRIMARY,
        spaceAfter=20,
        spaceBefore=40,
    ))
    
    # 副标题
    styles.add(ParagraphStyle(
        name='CustomSubtitle',
        fontName=font_name,
        fontSize=14,
        leading=20,
        alignment=TA_CENTER,
        textColor=ColorScheme.MUTED,
        spaceAfter=30,
    ))
    
    # 一级标题
    styles.add(ParagraphStyle(
        name='CustomH1',
        fontName=font_name,
        fontSize=22,
        leading=28,
        textColor=ColorScheme.PRIMARY,
        spaceBefore=25,
        spaceAfter=15,
        borderColor=ColorScheme.PRIMARY,
        borderWidth=0,
        borderPadding=0,
    ))
    
    # 二级标题
    styles.add(ParagraphStyle(
        name='CustomH2',
        fontName=font_name,
        fontSize=18,
        leading=24,
        textColor=ColorScheme.DARK,
        spaceBefore=20,
        spaceAfter=12,
    ))
    
    # 三级标题
    styles.add(ParagraphStyle(
        name='CustomH3',
        fontName=font_name,
        fontSize=14,
        leading=20,
        textColor=ColorScheme.SECONDARY,
        spaceBefore=15,
        spaceAfter=10,
    ))
    
    # 正文
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName=font_name,
        fontSize=11,
        leading=18,
        textColor=ColorScheme.DARK,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    ))
    
    # 代码内联 - 使用支持中文的字体
    styles.add(ParagraphStyle(
        name='InlineCode',
        fontName=font_name,
        fontSize=10,
        textColor=ColorScheme.DANGER,
        backColor=ColorScheme.LIGHT,
    ))
    
    # 列表项
    styles.add(ParagraphStyle(
        name='ListItem',
        fontName=font_name,
        fontSize=11,
        leading=16,
        leftIndent=20,
        textColor=ColorScheme.DARK,
        spaceAfter=4,
    ))
    
    # 表格标题
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName=font_name,
        fontSize=11,
        textColor=colors.white,
        alignment=TA_CENTER,
    ))
    
    # 表格单元格
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName=font_name,
        fontSize=10,
        textColor=ColorScheme.DARK,
        alignment=TA_LEFT,
    ))
    
    return styles

def parse_markdown(content):
    """解析 Markdown 内容为结构化数据"""
    elements = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # 空行
        if not line.strip():
            i += 1
            continue
        
        # 代码块
        if line.strip().startswith('```'):
            language = line.strip()[3:] or 'text'
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            elements.append(('code', '\n'.join(code_lines), language))
            i += 1
            continue
        
        # 标题
        if line.startswith('# '):
            elements.append(('h1', line[2:].strip()))
            i += 1
            continue
        elif line.startswith('## '):
            elements.append(('h2', line[3:].strip()))
            i += 1
            continue
        elif line.startswith('### '):
            elements.append(('h3', line[4:].strip()))
            i += 1
            continue
        elif line.startswith('#### '):
            elements.append(('h4', line[5:].strip()))
            i += 1
            continue
        
        # 分隔线
        if line.strip() in ['---', '***', '___']:
            elements.append(('hr',))
            i += 1
            continue
        
        # 表格
        if '|' in line and i + 1 < len(lines) and '---' in lines[i + 1]:
            table_rows = []
            while i < len(lines) and '|' in lines[i]:
                row = [cell.strip() for cell in lines[i].split('|')[1:-1]]
                if not all(set(cell) <= {'-', ':', ' '} for cell in row):
                    table_rows.append(row)
                i += 1
            if table_rows:
                elements.append(('table', table_rows))
            continue
        
        # 引用块
        if line.startswith('> '):
            quote_lines = []
            while i < len(lines) and lines[i].startswith('> '):
                quote_lines.append(lines[i][2:])
                i += 1
            elements.append(('quote', '\n'.join(quote_lines)))
            continue
        
        # 列表项
        if line.strip().startswith('- ') or line.strip().startswith('* '):
            list_items = []
            while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                item = lines[i].strip()[2:]
                list_items.append(item)
                i += 1
            elements.append(('list', list_items))
            continue
        
        # 有序列表
        if re.match(r'^\d+\.', line.strip()):
            list_items = []
            while i < len(lines) and re.match(r'^\d+\.', lines[i].strip()):
                item = re.sub(r'^\d+\.\s*', '', lines[i].strip())
                list_items.append(item)
                i += 1
            elements.append(('ordered_list', list_items))
            continue
        
        # 普通段落
        para_lines = []
        while i < len(lines) and lines[i].strip() and not lines[i].startswith('#') and not lines[i].startswith('```'):
            para_lines.append(lines[i])
            i += 1
        if para_lines:
            elements.append(('paragraph', ' '.join(para_lines)))
    
    return elements

def sanitize_text(text):
    """清理文本中可能导致 XML 解析错误的内容"""
    # 先移除或转义特殊字符
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text

def format_inline_text(text):
    """处理行内格式（加粗、斜体、代码等）- 更安全的版本"""
    # 处理下划线填空（如 ______）- 转换为可见的填空线
    text = re.sub(r'_{4,}', '____________', text)
    
    # 处理可能导致问题的嵌套格式 - 简化处理
    # 移除 **_xxxx_** 这种嵌套格式，只保留加粗
    text = re.sub(r'\*\*_+\*\*', '<b>______</b>', text)
    text = re.sub(r'\*\*\*+\*\*', '<b>______</b>', text)
    
    # 加粗 - 只匹配不包含下划线或星号的内容
    text = re.sub(r'\*\*([^*_]+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__([^_]+?)__', r'<b>\1</b>', text)
    
    # 斜体
    text = re.sub(r'(?<!\*)\*([^*]+?)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'(?<!_)_([^_]+?)_(?!_)', r'<i>\1</i>', text)
    
    # 内联代码 - 使用中文字体
    text = re.sub(r'`([^`]+)`', rf'<font face="{CHINESE_FONT}" color="#dc2626">\1</font>', text)
    
    # 删除线
    text = re.sub(r'~~(.+?)~~', r'<strike>\1</strike>', text)
    
    # 清理任何剩余的可能导致问题的模式
    text = re.sub(r'<b><i></b></i>', '', text)
    text = re.sub(r'<i><b></i></b>', '', text)
    
    return text

def split_code_block(code, max_lines=MAX_CODE_LINES):
    """将大代码块分割成多个小块"""
    lines = code.split('\n')
    if len(lines) <= max_lines:
        return [code]
    
    blocks = []
    for i in range(0, len(lines), max_lines):
        block = '\n'.join(lines[i:i + max_lines])
        blocks.append(block)
    return blocks

def build_pdf_content(elements, styles):
    """将解析的元素转换为 PDF 内容"""
    story = []
    
    for elem in elements:
        elem_type = elem[0]
        
        try:
            if elem_type == 'h1':
                text = format_inline_text(elem[1])
                story.append(Spacer(1, 10))
                story.append(Paragraph(text, styles['CustomH1']))
                story.append(HRFlowable(width="100%", thickness=2, color=ColorScheme.PRIMARY))
                
            elif elem_type == 'h2':
                text = format_inline_text(elem[1])
                story.append(Paragraph(text, styles['CustomH2']))
                
            elif elem_type == 'h3':
                text = format_inline_text(elem[1])
                story.append(Paragraph(text, styles['CustomH3']))
                
            elif elem_type == 'h4':
                text = format_inline_text(elem[1])
                story.append(Paragraph(f"● {text}", styles['CustomBody']))
                
            elif elem_type == 'paragraph':
                text = format_inline_text(elem[1])
                try:
                    story.append(Paragraph(text, styles['CustomBody']))
                except Exception as e:
                    # 如果解析失败，使用纯文本
                    clean_text = re.sub(r'<[^>]+>', '', text)
                    story.append(Paragraph(clean_text, styles['CustomBody']))
                
            elif elem_type == 'code':
                code_text = elem[1]
                language = elem[2] if len(elem) > 2 else 'text'
                
                # 分割大代码块
                code_blocks = split_code_block(code_text)
                for i, block in enumerate(code_blocks):
                    story.append(Spacer(1, 5))
                    story.append(CodeBlock(block, language))
                    if i < len(code_blocks) - 1:
                        # 如果还有后续块，添加"续"标记
                        story.append(Spacer(1, 3))
                story.append(Spacer(1, 10))
                
            elif elem_type == 'list':
                for item in elem[1]:
                    text = format_inline_text(item)
                    try:
                        story.append(Paragraph(f"• {text}", styles['ListItem']))
                    except:
                        clean_text = re.sub(r'<[^>]+>', '', text)
                        story.append(Paragraph(f"• {clean_text}", styles['ListItem']))
                story.append(Spacer(1, 5))
                
            elif elem_type == 'ordered_list':
                for i, item in enumerate(elem[1], 1):
                    text = format_inline_text(item)
                    try:
                        story.append(Paragraph(f"{i}. {text}", styles['ListItem']))
                    except:
                        clean_text = re.sub(r'<[^>]+>', '', text)
                        story.append(Paragraph(f"{i}. {clean_text}", styles['ListItem']))
                story.append(Spacer(1, 5))
                
            elif elem_type == 'table':
                table_data = elem[1]
                if table_data:
                    # 清理表格数据
                    clean_data = []
                    for row in table_data:
                        clean_row = []
                        for cell in row:
                            # 移除可能导致问题的格式
                            clean_cell = re.sub(r'[*_`]', '', cell)
                            clean_row.append(clean_cell)
                        clean_data.append(clean_row)
                    
                    # 创建表格
                    t = Table(clean_data, repeatRows=1)
                    t.setStyle(TableStyle([
                        # 表头样式
                        ('BACKGROUND', (0, 0), (-1, 0), ColorScheme.PRIMARY),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('FONTNAME', (0, 0), (-1, 0), CHINESE_FONT),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                        ('TOPPADDING', (0, 0), (-1, 0), 8),
                        # 数据行样式
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), ColorScheme.DARK),
                        ('FONTNAME', (0, 1), (-1, -1), CHINESE_FONT),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
                        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                        ('TOPPADDING', (0, 1), (-1, -1), 6),
                        # 交替行颜色
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ColorScheme.LIGHT]),
                        # 边框
                        ('GRID', (0, 0), (-1, -1), 0.5, ColorScheme.MUTED),
                        ('BOX', (0, 0), (-1, -1), 1, ColorScheme.PRIMARY),
                    ]))
                    story.append(Spacer(1, 10))
                    story.append(t)
                    story.append(Spacer(1, 10))
                    
            elif elem_type == 'quote':
                text = format_inline_text(elem[1])
                # 使用简单的带缩进的段落代替 TipBox
                story.append(Spacer(1, 5))
                try:
                    story.append(Paragraph(f"💡 {text}", styles['CustomBody']))
                except:
                    clean_text = re.sub(r'<[^>]+>', '', text)
                    story.append(Paragraph(f"💡 {clean_text}", styles['CustomBody']))
                story.append(Spacer(1, 10))
                
            elif elem_type == 'hr':
                story.append(Spacer(1, 10))
                story.append(HRFlowable(width="100%", thickness=1, color=ColorScheme.MUTED))
                story.append(Spacer(1, 10))
        except Exception as e:
            print(f"  警告: 处理元素时出错 ({elem_type}): {e}")
            continue
    
    return story

def add_cover_page(title, subtitle, doc_type, styles):
    """添加封面页"""
    story = []
    
    # 顶部装饰
    story.append(Spacer(1, 60))
    
    # 清理标题中的格式符号
    clean_title = re.sub(r'[📘📝🎯💡✅❌⭐*_`]', '', title).strip()
    
    # 主标题
    story.append(Paragraph(
        f'<font color="#2563eb" size="28">{clean_title}</font>',
        styles['CustomTitle']
    ))
    
    # 文档类型标签
    type_colors = {
        '讲义': '#2563eb',
        '测试卷': '#059669',
    }
    color = type_colors.get(doc_type, '#2563eb')
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f'<font color="{color}" size="18">{doc_type}</font>',
        styles['CustomSubtitle']
    ))
    
    # 副标题/描述
    if subtitle:
        story.append(Spacer(1, 30))
        story.append(Paragraph(subtitle, styles['CustomSubtitle']))
    
    # 分隔线
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="60%", thickness=3, color=ColorScheme.PRIMARY, hAlign='CENTER'))
    
    # 底部信息
    story.append(Spacer(1, 80))
    story.append(Paragraph(
        '<font color="#6b7280" size="12">C++ 算法训练营课程资料</font>',
        styles['CustomSubtitle']
    ))
    story.append(Paragraph(
        '<font color="#6b7280" size="10">版权所有 2024</font>',
        styles['CustomSubtitle']
    ))
    
    story.append(PageBreak())
    return story

def add_page_number(canvas, doc):
    """添加页码和页眉"""
    canvas.saveState()
    
    # 页脚
    page_num = canvas.getPageNumber()
    footer_text = f"- {page_num} -"
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(ColorScheme.MUTED)
    canvas.drawCentredString(A4[0]/2, 15*mm, footer_text)
    
    # 页眉装饰线
    if page_num > 1:
        canvas.setStrokeColor(ColorScheme.PRIMARY)
        canvas.setLineWidth(0.5)
        canvas.line(25*mm, A4[1] - 18*mm, A4[0] - 25*mm, A4[1] - 18*mm)
    
    canvas.restoreState()

def convert_md_to_pdf(md_path, output_dir):
    """将单个 Markdown 文件转换为 PDF"""
    # 读取 Markdown 内容
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 获取文件信息
    filename = Path(md_path).stem
    parent_dir = Path(md_path).parent.name
    
    # 确定文档类型
    if '讲义' in filename:
        doc_type = '讲义'
    elif '测试卷' in filename:
        doc_type = '测试卷'
    else:
        doc_type = '文档'
    
    # 提取标题
    title_match = re.match(r'#\s*(.+)', content.split('\n')[0])
    if title_match:
        title = title_match.group(1).strip()
        # 移除 emoji
        title = re.sub(r'[📘📝🎯💡✅❌⭐]', '', title).strip()
    else:
        title = filename
    
    # 创建输出文件名
    output_filename = f"{parent_dir}_{doc_type}.pdf"
    output_path = os.path.join(output_dir, output_filename)
    
    print(f"正在生成: {output_filename}")
    
    # 创建样式
    styles = create_styles(CHINESE_FONT)
    
    # 创建 PDF 文档
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=25*mm,
        leftMargin=25*mm,
        topMargin=22*mm,
        bottomMargin=22*mm,
        title=title,
        author='C++ 算法训练营',
    )
    
    # 构建内容
    story = []
    
    # 添加封面
    story.extend(add_cover_page(title, parent_dir, doc_type, styles))
    
    # 解析并添加 Markdown 内容
    elements = parse_markdown(content)
    story.extend(build_pdf_content(elements, styles))
    
    # 生成 PDF
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    print(f"✓ 完成: {output_path}")
    return output_path

def main():
    """主函数"""
    # 设置路径
    base_dir = Path(__file__).parent
    output_dir = base_dir / 'pdf_output'
    
    # 创建输出目录
    output_dir.mkdir(exist_ok=True)
    print(f"输出目录: {output_dir}")
    
    # 先注册字体
    print("\n注册字体...")
    register_chinese_fonts()
    print(f"正文字体: {CHINESE_FONT}")
    print(f"代码字体: {CODE_FONT}")
    
    # 查找所有讲义和测试卷
    md_files = []
    for lesson_dir in sorted(base_dir.glob('第*课_*')):
        if lesson_dir.is_dir():
            md_files.extend(lesson_dir.glob('*.md'))
    
    print(f"\n找到 {len(md_files)} 个 Markdown 文件\n")
    print("=" * 50)
    
    # 转换每个文件
    generated_pdfs = []
    failed_files = []
    for md_file in sorted(md_files):
        try:
            pdf_path = convert_md_to_pdf(str(md_file), str(output_dir))
            generated_pdfs.append(pdf_path)
        except Exception as e:
            print(f"✗ 转换失败: {md_file.name}")
            print(f"  错误: {e}")
            failed_files.append((md_file.name, str(e)))
    
    print("\n" + "=" * 50)
    print(f"共生成 {len(generated_pdfs)} 个 PDF 文件")
    if failed_files:
        print(f"失败 {len(failed_files)} 个文件")
    print(f"输出位置: {output_dir}")
    
    # 列出所有生成的文件
    print("\n✅ 成功生成的文件:")
    for pdf in sorted(generated_pdfs):
        print(f"  - {Path(pdf).name}")
    
    if failed_files:
        print("\n❌ 失败的文件:")
        for name, error in failed_files:
            print(f"  - {name}")

if __name__ == '__main__':
    main()
