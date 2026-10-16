```
             _            _           _ _                         _ _     _   
            | |          | |         | | |                       | (_)   | |  
 __  ___   _| |____   ___| |__   __ _| | | ___ _ __   __ _  ___  | |_ ___| |_ 
 \ \/ / | | | |_  /  / __| '_ \ / _` | | |/ _ \ '_ \ / _` |/ _ \ | | / __| __|
  >  <| |_| | |/ /  | (__| | | | (_| | | |  __/ | | | (_| |  __/ | | \__ \ |_ 
 /_/\_\\__, |_/___|  \___|_| |_|\__,_|_|_|\___|_| |_|\__, |\___| |_|_|___/\__|
        __/ |                                         __/ |                   
       |___/                                         |___/                    
```

Welcome to the repository for xylz.online! (formerly xylz.tv)

The challenge list is served at `https://xylz.online/list/`. Keep page links and
assets relative to this directory. `js/config.js` derives the API base from its
own URL so API calls stay on the same origin and under `/list/`.

Browser regression checks (Python, Playwright, and Chromium required):
`python3 tests/list_migration.py`. The checks mock all APIs and never create
production records. When changing modules, update the cache version in their
HTML script tags and shared configuration imports.

## Contact

Join our community on Discord: [Join us](https://discord.gg/HMjWaGh)
