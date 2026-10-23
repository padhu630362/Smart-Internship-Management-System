import os
import re

routes_dir = 'backend/src/routes'
all_endpoints = []

route_prefixes = {
    'healthRoutes.js': '/api/health',
    'authRoutes.js': '/api/auth',
    'userRoutes.js': '/api/users',
    'internshipRoutes.js': '/api/internships',
    'applicationRoutes.js': '/api/applications',
    'allocationRoutes.js': '/api/allocations',
    'attendanceRoutes.js': '/api/attendance',
    'taskRoutes.js': '/api/tasks',
    'notificationRoutes.js': '/api/notifications',
    'chatRoutes.js': '/api/chat',
    'evaluationRoutes.js': '/api/evaluations',
    'analyticsRoutes.js': '/api/analytics',
    'reportRoutes.js': '/api/reports',
    'certificateRoutes.js': '/api/certificates',
    'externalJobRoutes.js': '/api/external-jobs',
}

for f in sorted(os.listdir(routes_dir)):
    if f in route_prefixes:
        path = os.path.join(routes_dir, f)
        prefix = route_prefixes[f]
        
        with open(path, 'r', encoding='utf-8') as rf:
            content = rf.read()
            # find router.<method>(...)
            matches = re.findall(r'router\.(get|post|put|patch|delete)\(\s*[\'"]([^\'"]+)[\'"]', content)
            for method, subpath in matches:
                full_ep = prefix + ('' if subpath == '/' else subpath)
                all_endpoints.append((f, method.upper(), full_ep))

print(f'Total endpoints found: {len(all_endpoints)}')
for f, m, ep in all_endpoints:
    print(f'{f:22} {m:6} {ep}')

