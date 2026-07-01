from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from .base import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="用户ID")
    username = Column(String(64), unique=True, nullable=False, comment="用户名")
    email = Column(String(255), unique=True, nullable=True, )
    uid = Column(String, nullable=False, unique=True, index=True, comment="邮箱")  

    password_hash = Column(String(255), nullable=False, comment="密码哈希")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(
        ), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class Conversation(Base):
    __tablename__ = "conversation"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="会话ID")
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, comment="用户ID")
    title = Column(String(255), nullable=False, comment="会话标题")
    summary = Column(Text, nullable=True, comment="会话摘要")
    conversation_metadata = Column(JSON, nullable=False, default=dict, comment="会话元数据")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "message"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="消息ID")
    conversation_id = Column(Integer, ForeignKey("conversation.id", ondelete="CASCADE"), nullable=False, comment="会话ID")
    agent_run_id = Column(Integer, ForeignKey("agent_run.id", ondelete="SET NULL"), nullable=True, comment="运行ID")
    role = Column(String(16), nullable=False, comment="消息角色")
    content = Column(Text, nullable=False, default="", comment="消息内容")
    status = Column(String(16), nullable=False, default="completed", comment="消息状态")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    conversation = relationship("Conversation", back_populates="messages")
    agent_run = relationship("AgentRun", back_populates="messages")
    tool_calls = relationship("ToolCall", back_populates="message", cascade="all, delete-orphan", order_by="ToolCall.tool_sequence")


class ToolCall(Base):
    __tablename__ = "tool_call"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="工具调用ID")
    message_id = Column(Integer, ForeignKey("message.id", ondelete="CASCADE"), nullable=False, comment="消息ID")
    tool_sequence = Column(Integer, nullable=False, comment="工具调用顺序")
    tool_call_id = Column(String(255), nullable=True, comment="模型返回的工具调用ID")
    tool_name = Column(String(255), nullable=False, comment="工具名称")
    tool_arguments = Column(JSON, nullable=False, default=dict, comment="工具参数")
    tool_input = Column(JSON , nullable=True, comment="工具输入")
    tool_result = Column(Text, nullable=True, comment="工具结果")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")

    message = relationship("Message", back_populates="tool_calls")


class AgentRun(Base):
    __tablename__ = "agent_run"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="运行ID")
    conversation_id = Column(Integer, ForeignKey("conversation.id", ondelete="CASCADE"), nullable=False, comment="会话ID")
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, comment="用户ID")
    agent_id = Column(String(128), nullable=False, comment="智能体ID")
    input_text = Column(Text, nullable=False, default="", comment="输入文本")
    attachments = Column(JSON, nullable=False, default=dict, comment="附件")
    request_config = Column(JSON, nullable=False, default=dict, comment="请求配置")
    status = Column(String(16), nullable=False, default="queued", comment="运行状态")
    error = Column(Text, nullable=True, comment="错误信息")
    started_at = Column(DateTime(timezone=True), nullable=True, comment="开始时间")
    finished_at = Column(DateTime(timezone=True), nullable=True, comment="结束时间")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    user = relationship("User")
    messages = relationship("Message", back_populates="agent_run")


class Agent(Base):
    __tablename__ = "agent"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="智能体ID")
    slug = Column(String(128), unique=True, index=True, nullable=False, comment="URL 友好的稳定标识")
    backend_id = Column(String(128), nullable=False, comment="后端运行实现ID")
    name = Column(String(128), nullable=False, comment="智能体名称")
    role = Column(String(32), nullable=False, default="orchestrator", comment="智能体角色")
    description = Column(Text, nullable=False, default="", comment="智能体描述")
    agent_config = Column(JSON, nullable=False, default=dict, comment="智能体配置")
    internal_only = Column(Boolean, nullable=False, default=True, comment="是否仅内部可见")
    enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class StylePortfolio(Base):
    __tablename__ = "style_portfolio"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="风格资产包ID")
    user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True, comment="创建用户ID")
    slug = Column(String(128), unique=True, index=True, nullable=False, comment="URL 友好的稳定标识")
    name = Column(String(128), nullable=False, comment="风格资产包名称")
    description = Column(Text, nullable=False, default="", comment="风格资产包描述")
    style_text = Column(Text, nullable=False, default="", comment="风格说明")
    reference_cases = Column(JSON, nullable=False, default=list, comment="参考案例")
    visual_language = Column(JSON, nullable=False, default=dict, comment="色彩、镜头、构图、元素等视觉语言")
    narrative_patterns = Column(JSON, nullable=False, default=dict, comment="叙事结构与场景推进模式")
    style_assets = Column(JSON, nullable=False, default=dict, comment="示例、规则、禁忌等风格资产")
    skill_refs = Column(JSON, nullable=False, default=list, comment="关联的技能引用")
    visibility = Column(String(16), nullable=False, default="private", comment="可见范围")
    enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    user = relationship("User")


class Skill(Base):
    __tablename__ = "skill"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="技能ID")
    user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True, comment="创建用户ID")
    slug = Column(String(128), unique=True, index=True, nullable=False, comment="URL 友好的稳定标识")
    name = Column(String(128), nullable=False, comment="技能名称")
    skill_type = Column(String(32), nullable=False, default="general", comment="技能类型")
    description = Column(Text, nullable=False, default="", comment="技能描述")
    instruction = Column(Text, nullable=False, default="", comment="技能说明")
    skill_assets = Column(JSON, nullable=False, default=dict, comment="示例、规则、模板等技能资产")
    visibility = Column(String(16), nullable=False, default="private", comment="可见范围")
    enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    user = relationship("User")


class Attachment(Base):
    __tablename__ = "attachment"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="附件ID")
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, comment="用户ID")
    conversation_id = Column(Integer, ForeignKey("conversation.id", ondelete="SET NULL"), nullable=True, comment="来源会话ID")
    status = Column(String(16), nullable=False, default="pending", comment="附件状态")
    attachment_name = Column(String(255), nullable=False, comment="文件名")
    attachment_type = Column(String(128), nullable=False, comment="文件类型")
    attachment_size = Column(Integer, nullable=False, comment="文件大小")
    attachment_path = Column(String(1024), nullable=False, comment="MinIO对象路径")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")


class Knowledge(Base):
    __tablename__ = "knowledge"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="知识库ID")
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, comment="用户ID")
    kind = Column(String(32), nullable=False, default="screenplay", comment="知识库类型")
    title = Column(String(255), nullable=False, comment="标题")
    summary = Column(Text, nullable=False, default="", comment="摘要")
    content_text = Column(Text, nullable=True, comment="文本内容")
    knowlege_file_name = Column(String(512), nullable=True, comment="文件名")
    knowlege_file_name_og = Column(String(512), nullable=True, comment="原始文件名")
    knowlege_file_path = Column(String(1024), nullable=True, comment="原始文件MinIO路径")
    knowlege_file_minio_url = Column(String(1024), nullable=True, comment="原始文件MinIO URL")
    knowlege_markdown = Column(String(1024), nullable=True, comment="解析后Markdown文件路径")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), comment="更新时间")
