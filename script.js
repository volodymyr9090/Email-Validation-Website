document.addEventListener('DOMContentLoaded', function() {
    // Theme switcher
    const toggleSwitch = document.querySelector('#checkbox');
    const currentTheme = localStorage.getItem('theme') || 'light';
    const themeLabel = document.getElementById('theme-label');
    
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        toggleSwitch.checked = currentTheme === 'dark';
        themeLabel.textContent = currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
    
    toggleSwitch.addEventListener('change', function(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeLabel.textContent = 'Dark Mode';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeLabel.textContent = 'Light Mode';
        }
    });
    
    // Email validation
    const emailInput = document.getElementById('emailInput');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const validEmails = document.getElementById('validEmails');
    const invalidEmails = document.getElementById('invalidEmails');
    const allowRoles = document.getElementById('allowRoles');
    const allowDisposable = document.getElementById('allowDisposable');
    const allowUnlikely = document.getElementById('allowUnlikely');
    
    // Cache for MX records
    const mxCache = {};
    
    // Unlikely patterns
    const unlikelyPatterns = ['nospam', 'spam@', '@example', 'example@', 'nothanks', 'testing@'];
    
    processButton.addEventListener('click', async function() {
        const emails = parseEmails(emailInput.value);
        if (emails.length === 0) {
            alert('Please enter at least one email address');
            return;
        }
        
        // Reset UI
        processButton.style.display = 'none';
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        validEmails.value = '';
        invalidEmails.value = '';
        
        const totalEmails = emails.length;
        let processedCount = 0;
        
        for (const email of emails) {
            const result = await validateEmail(email);
            
            if (result.valid) {
                validEmails.value += (validEmails.value ? '\n' : '') + result.email;
            } else {
                invalidEmails.value += (invalidEmails.value ? '\n' : '') + result.email;
            }
            
            processedCount++;
            progressBar.style.width = `${(processedCount / totalEmails) * 100}%`;
        }
        
        // Restore UI
        progressContainer.style.display = 'none';
        processButton.style.display = 'block';
        emailInput.value = '';
    });
    
    function parseEmails(input) {
        const lines = input.split('\n');
        const emails = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Check for "Name <email@example.com>" format
            const match = trimmed.match(/<([^>]+)>/);
            if (match && match[1]) {
                emails.push(match[1].trim());
            } else {
                emails.push(trimmed);
            }
        }
        
        return emails;
    }
    
    async function validateEmail(email) {
        // Step 1: Basic email validation with regex
        if (!isValidEmailFormat(email)) {
            return { email, valid: false, reason: 'Invalid email format' };
        }
        
        const [localPart, domain] = email.split('@');
        
        // Step 2: Check for unlikely valid patterns if not allowed
        if (!allowUnlikely.checked && isUnlikelyValid(localPart, domain)) {
            return { email, valid: false, reason: 'Unlikely valid email' };
        }
        
        // Step 3: Check for role-based emails if not allowed
        if (!allowRoles.checked && isRoleBased(localPart, domain)) {
            return { email, valid: false, reason: 'Role-based email' };
        }
        
        // Step 4: Check for disposable domains if not allowed
        if (!allowDisposable.checked && isDisposableDomain(domain)) {
            return { email, valid: false, reason: 'Disposable email domain' };
        }
        
        // Step 5: Check MX records
        if (!(await hasMXRecords(domain))) {
            return { email, valid: false, reason: 'No MX records found' };
        }
        
        return { email, valid: true };
    }
    
    function isValidEmailFormat(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function isUnlikelyValid(localPart, domain) {
        const combined = localPart + '@' + domain;
        const lettersOnly = combined.replace(/[^a-zA-Z@]/g, '').toLowerCase();
        
        return unlikelyPatterns.some(pattern => 
            lettersOnly.includes(pattern.toLowerCase())
        );
    }
    
    function isRoleBased(localPart) {
        return roleBasedEmails.includes(localPart.toLowerCase());
    }
    
    function isDisposableDomain(domain) {
        return disposableDomains.includes(domain.toLowerCase());
    }
    
    async function hasMXRecords(domain) {
        if (mxCache[domain] !== undefined) {
            return mxCache[domain];
        }
        
        try {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
            const data = await response.json();
            
            const hasRecords = data.Answer && data.Answer.some(record => record.type === 15);
            mxCache[domain] = hasRecords;
            return hasRecords;
        } catch (error) {
            console.error('DNS lookup failed:', error);
            mxCache[domain] = false;
            return false;
        }
    }
});