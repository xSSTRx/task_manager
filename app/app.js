document.addEventListener("DOMContentLoaded", () => {
    // Funkcja generująca losową sól
    // Używana do tworzenia unikalnej soli dla każdego użytkownika w celu zwiększenia bezpieczeństwa haseł.
    function generateSalt(length = 16) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Funkcja haszująca hasło z użyciem SHA-256
    // Łączy hasło z solą, aby stworzyć unikalny hash, który jest przechowywany w lokalnym magazynie.
    async function hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Funkcja walidująca hasło
    // Sprawdza, czy hasło spełnia minimalne wymagania dotyczące długości i złożoności.
    function validatePassword(password) {
        if (password.length < 8) {
            alert("Hasło powinno mieć co najmniej 8 znaków.");
            return false;
        }
        if (!/[A-Z]/.test(password)) {
            alert("Hasło powinno zawierać co najmniej jedną wielką literę.");
            return false;
        }
        if (!/[a-z]/.test(password)) {
            alert("Hasło powinno zawierać co najmniej jedną małą literę.");
            return false;
        }
        if (!/[0-9]/.test(password)) {
            alert("Hasło powinno zawierać co najmniej jedną cyfrę.");
            return false;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            alert("Hasło powinno zawierać co najmniej jeden znak specjalny.");
            return false;
        }
        return true;
    }

    // Elementy interfejsu użytkownika
    // Zbierają wszystkie elementy interfejsu potrzebne do obsługi logowania, rejestracji i głównej aplikacji.
    const authContainer = document.getElementById("auth-container");
    const registerContainer = document.getElementById("register-container");
    const loginContainer = document.getElementById("login-container");
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    const regUsernameInput = document.getElementById("reg-username");
    const regPasswordInput = document.getElementById("reg-password");
    const registerButton = document.getElementById("register-button");

    const loginUsernameInput = document.getElementById("login-username");
    const loginPasswordInput = document.getElementById("login-password");
    const loginButton = document.getElementById("login-button");

    const appContainer = document.getElementById("app-container");
    const logoutButton = document.getElementById("logout-button");
    const usernameDisplay = document.getElementById("username-display");

    // Elementy zarządzania zadaniami
    const taskList = document.getElementById("task-list");
    const taskInput = document.getElementById("task-input");
    const taskDeadline = document.getElementById("task-deadline");
    const taskCategory = document.getElementById("task-category");
    const addTaskButton = document.getElementById("add-task");

    // Elementy kalendarza
    const calendarContainer = document.getElementById("calendar-container");
    const calendar = document.getElementById("calendar");
    const prevMonthButton = document.createElement("button");
    const nextMonthButton = document.createElement("button");
    const monthYearDisplay = document.createElement("span");

    // Ukrywanie niepotrzebnych elementów interfejsu podczas ładowania
    calendarContainer.style.display = "none";
    appContainer.style.display = "none";

    // Inicjalizacja zmiennych globalnych
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    let tasks = []; // Lista zadań użytkownika
    let users = JSON.parse(localStorage.getItem("users")) || {}; // Pobranie użytkowników z lokalnego magazynu
    let currentUser = null; // Aktualnie zalogowany użytkownik

    // Nagłówek kalendarza (nawigacja między miesiącami)
    const calendarHeader = document.createElement("div");
    calendarHeader.style.display = "flex";
    calendarHeader.style.justifyContent = "space-between";
    calendarHeader.style.alignItems = "center";
    calendarHeader.style.marginBottom = "10px";

    prevMonthButton.textContent = "Poprzedni";
    nextMonthButton.textContent = "Następny";
    monthYearDisplay.style.fontSize = "1.2em";
    monthYearDisplay.style.fontWeight = "bold";

    calendarHeader.appendChild(prevMonthButton);
    calendarHeader.appendChild(monthYearDisplay);
    calendarHeader.appendChild(nextMonthButton);
    calendarContainer.insertBefore(calendarHeader, calendar);

    // Miesiące w roku
    const months = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];

    // Funkcja do oczyszczania wejścia użytkownika (zabezpieczenie przed XSS)
    function sanitizeInput(input) {
        const div = document.createElement("div");
        div.textContent = input;
        return div.innerHTML;
    }

    // Funkcja generująca kalendarz
    // Tworzy wizualizację dni miesiąca i oznacza dni z zadaniami.
    function generateCalendar(month, year) {
        calendar.innerHTML = "";
        monthYearDisplay.textContent = `${months[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement("div");
            emptyCell.classList.add("calendar-day");
            calendar.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement("div");
            dayCell.classList.add("calendar-day");
            dayCell.textContent = day;

            const dayDate = new Date(year, month, day).toISOString().split("T")[0];
            const hasTask = tasks.some(task => task.deadline.startsWith(dayDate));
            if (hasTask) {
                dayCell.classList.add("selected");
                dayCell.addEventListener("click", () => showTasksForDate(dayDate));
            }

            calendar.appendChild(dayCell);
        }
    }

    // Wyświetlanie zadań dla konkretnego dnia
    function showTasksForDate(date) {
        const filteredTasks = tasks.filter(task => task.deadline.startsWith(date));
        alert(`Zadania na ${date}:
${filteredTasks.map(task => `- ${sanitizeInput(task.text)}`).join("\n") || "Brak zadań"}`);
    }

    // Aktualizacja kalendarza po zmianach
    function updateCalendar() {
        generateCalendar(currentMonth, currentYear);
    }

    // Obsługa zmiany miesiąca na poprzedni
    prevMonthButton.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateCalendar();
    });

    // Obsługa zmiany miesiąca na następny
    nextMonthButton.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateCalendar();
    });

    // Przełączanie między widokiem rejestracji i logowania
    showRegisterLink.addEventListener("click", () => {
        loginContainer.style.display = "none";
        registerContainer.style.display = "block";
    });

    showLoginLink.addEventListener("click", () => {
        registerContainer.style.display = "none";
        loginContainer.style.display = "block";
    });

    // Rejestracja nowego użytkownika
    registerButton.addEventListener("click", async () => {
        const username = sanitizeInput(regUsernameInput.value.trim());
        const password = regPasswordInput.value.trim();

        if (username && password) {
            if (!validatePassword(password)) {
                return;
            }
            if (users[username]) {
                alert("Użytkownik o tej nazwie już istnieje.");
            } else {
                const salt = generateSalt();
                const hashedPassword = await hashPassword(password, salt);
                users[username] = { password: hashedPassword, salt: salt };
                localStorage.setItem("users", JSON.stringify(users));
                regUsernameInput.value = "";
                regPasswordInput.value = "";
                alert("Rejestracja zakończona pomyślnie. Możesz się teraz zalogować.");
                showLoginLink.click();
            }
        } else {
            alert("Proszę wypełnić wszystkie pola.");
        }
    });

    // Logowanie użytkownika
    loginButton.addEventListener("click", async () => {
        const username = sanitizeInput(loginUsernameInput.value.trim());
        const password = loginPasswordInput.value.trim();

        if (username && password) {
            if (users[username]) {
                const { salt, password: storedPassword } = users[username];
                const hashedPassword = await hashPassword(password, salt);
                if (hashedPassword === storedPassword) {
                    currentUser = username;
                    usernameDisplay.textContent = currentUser;

                    authContainer.style.display = "none";
                    appContainer.style.display = "block";
                    calendarContainer.style.display = "block";
                    updateCalendar();
                } else {
                    alert("Nieprawidłowe hasło.");
                }
            } else {
                alert("Użytkownik nie istnieje.");
            }
        } else {
            alert("Proszę wypełnić wszystkie pola.");
        }
    });

    // Wylogowanie użytkownika
    logoutButton.addEventListener("click", () => {
        currentUser = null;
        authContainer.style.display = "block";
        appContainer.style.display = "none";
        calendarContainer.style.display = "none";
        taskList.innerHTML = "";
    });

    // Renderowanie listy zadań
    // Tworzy dynamiczną listę zadań i umożliwia ich usuwanie lub oznaczanie jako zakończone.
    function renderTasks() {
        taskList.innerHTML = "";
        tasks.forEach((task, index) => {
            const taskItem = document.createElement("li");
            taskItem.textContent = `${sanitizeInput(task.text)} (${sanitizeInput(task.deadline)}) - ${sanitizeInput(task.category)}`;
            if (task.done) taskItem.style.textDecoration = "line-through";

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Usuń";
            deleteButton.addEventListener("click", () => {
                tasks.splice(index, 1);
                updateCalendar();
                renderTasks();
            });

            const completeButton = document.createElement("button");
            completeButton.textContent = "Zakończ";
            completeButton.addEventListener("click", () => {
                tasks[index].done = !tasks[index].done;
                renderTasks();
            });

            taskItem.appendChild(completeButton);
            taskItem.appendChild(deleteButton);
            taskList.appendChild(taskItem);
        });
    }

    // Dodawanie nowego zadania
    addTaskButton.addEventListener("click", () => {
        const taskText = sanitizeInput(taskInput.value.trim());
        const deadline = taskDeadline.value;
        const category = sanitizeInput(taskCategory.value);

        if (taskText && deadline) {
            tasks.push({ text: taskText, deadline, category, done: false });
            taskInput.value = "";
            taskDeadline.value = "";
            renderTasks();
            updateCalendar();
        } else {
            alert("Wypełnij wszystkie pola zadania.");
        }
    });

    // Inicjalizacja listy zadań
    renderTasks();
});
