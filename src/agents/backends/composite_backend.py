"""
基于 deepagent 的backend以及filesystem构建通往sandbox的路径
"""
from deepagents.backends import CompositeBackend, FilesystemBackend, StateBackend
from deepagents.middleware.filesystem import FilesystemMiddleware

EVICT_TOOL_EXEMPT = {"read_file"} # read_file 的长结果直接返回state，避免落入一些backend
 

def create_compoiste_backend()->CompositeBackend:
    # TODO 创建供给 FileSystemMiddleware 的操作使用，默认是直接炼乳沙盒了
    pass


# 要记住一点，对于原生的FilesystemMiddleware来说，他会把工具
class CustomFilesystemMiddleware(FilesystemMiddleware):
    
    async def awrap_tool_call(self, request, handler):
        
        # 利用middleware执行链执行获取
        tool_results = await handler(request)
        
        # 未规定token限制的情况下直接renturn 结果
        if self._tool_token_limit_before_evict is None:
            return tool_results 
        
        if request.tool_call["name"]  in  EVICT_TOOL_EXEMPT:
            return tool_results
        
        return self._aintercept_large_tool_result(tool_results, request.runtime)     
        
    
    def wrap_tool_call(self, request, handler):
        tool_results = handler(request)
                
        # 未规定token限制的情况下直接renturn 结果
        if self._tool_token_limit_before_evict is None:
            return tool_results 
                
        if request.tool_call["name"]  in  EVICT_TOOL_EXEMPT:
            return tool_results
                
        return self._intercept_large_tool_result(tool_results, request.runtime)    
        
    
    