proxy_http_version 1.1;
proxy_set_header Host $http_host;
# Overwritten, never appended: a client cannot choose the address we record.
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_hide_header Content-Security-Policy;
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-Frame-Options;
proxy_hide_header Referrer-Policy;
