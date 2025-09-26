# Data 目录

这个目录用于存储项目的数据文件。

## 工作记录导出

### 使用方法

1. 在浏览器中打开项目主页面
2. 打开浏览器控制台（F12）
3. 工作记录导出脚本会自动加载
4. 导出的JSON文件会自动下载到浏览器默认下载目录
5. 请将下载的文件移动到此 `data` 目录中

### 导出文件格式

导出的JSON文件包含以下结构：

```json
{
  "export_info": {
    "export_time": "导出时间",
    "total_records": "记录总数",
    "export_source": "AutogenUnifiedStorage"
  },
  "work_records": [
    {
      "key": "记录键",
      "type": "work_record",
      "data": {
        "id": "记录ID",
        "title": "记录标题",
        "description": "记录描述",
        "achievements": ["成就列表"],
        "files_created": ["创建的文件"],
        "files_modified": ["修改的文件"],
        "technical_details": {},
        "status": "completed",
        "tags": ["标签"],
        "metadata": {}
      }
    }
  ],
  "statistics": {
    "by_status": {},
    "by_tags": {},
    "by_date": {},
    "total_achievements": 0,
    "total_files_created": 0,
    "total_files_modified": 0
  }
}
```

### 文件命名规则

导出文件命名格式：`work_records_export_YYYY-MM-DD_timestamp.json`

例如：`work_records_export_2025-09-26_1758885488028.json`

## 注意事项

- 导出的文件包含完整的工作记录数据和统计信息
- 请定期备份重要的工作记录文件
- 文件采用UTF-8编码，可以用任何文本编辑器打开查看
