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
        if (password.length > 25) {
            alert("Hasło może mieć maksymalnie 25 znaków.");
            return false;
        }
        return true;
    }

    // Elementy interfejsu użytkownika
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

    // *** LISTA ZADAŃ UŻYTKOWNIKA PRZECHOWYWANA W PAMIĘCI ***
    let tasks = [];
    // *** STRUKTURA UŻYTKOWNIKÓW POZYSKIWANA Z localStorage ***
    let users = JSON.parse(localStorage.getItem("users")) || {};
    // *** ZMIENNA PRZECHOWUJĄCA NAZWĘ ZALOGOWANEGO UŻYTKOWNIKA ***
    let currentUser = null;

    // -----------------------
    // FUNKCJE POMOCNICZE
    // -----------------------

    // Tworzymy dwie funkcje, które będą za każdym razem wczytywać/zapisywać listę zadań do localStorage dla aktualnego użytkownika:

    function loadTasksForCurrentUser() {
        if (currentUser && users[currentUser].tasks) {
            tasks = users[currentUser].tasks;
        } else {
            tasks = [];
        }
    }

    function saveTasksForCurrentUser() {
        if (currentUser) {
            // Jeśli użytkownik jeszcze nie ma tablicy tasks, to ją tworzymy
            if (!users[currentUser].tasks) {
                users[currentUser].tasks = [];
            }
            users[currentUser].tasks = tasks;
            localStorage.setItem("users", JSON.stringify(users));
        }
    }

    // Funkcja do oczyszczania wejścia użytkownika (zabezpieczenie przed XSS)
    function sanitizeInput(input) {
        const div = document.createElement("div");
        div.textContent = input;
        return div.innerHTML;
    }

    // -----------------------
    // KALENDARZ
    // -----------------------
    // Dodajemy przyciski i nagłówek do kalendarza
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

    // Funkcja generująca kalendarz
    function generateCalendar(month, year) {
        calendar.innerHTML = "";
        monthYearDisplay.textContent = `${months[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Wypełniamy pustymi polami przed pierwszym dniem miesiąca
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement("div");
            emptyCell.classList.add("calendar-day");
            calendar.appendChild(emptyCell);
        }

        // Kolejne dni miesiąca
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement("div");
            dayCell.classList.add("calendar-day");
            dayCell.textContent = day;

            // Oznaczanie dni, w których jest zadanie
            const dayDate = new Date(year, month, day).toISOString().split("T")[0];
            const hasTask = tasks.some(task => task.deadline.startsWith(dayDate));
            if (hasTask) {
                dayCell.classList.add("selected");
                dayCell.addEventListener("click", () => showTasksForDate(dayDate));
            }

            calendar.appendChild(dayCell);
        }
    }

    // Wyświetlanie zadań dla konkretnego dnia (w alercie)
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

    // -----------------------
    // REJESTRACJA / LOGOWANIE
    // -----------------------

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
                return; // Jeśli hasło nie przeszło walidacji, kończymy
            }
            if (users[username]) {
                alert("Użytkownik o tej nazwie już istnieje.");
            } else {
                const salt = generateSalt();
                const hashedPassword = await hashPassword(password, salt);
                // Tworzymy nowy obiekt użytkownika z pustą tablicą tasks
                users[username] = { password: hashedPassword, salt: salt, tasks: [] };
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

                    // Wczytujemy zadania z localStorage przypisane do aktualnego użytkownika
                    loadTasksForCurrentUser();

                    authContainer.style.display = "none";
                    appContainer.style.display = "block";
                    calendarContainer.style.display = "block";

                    updateCalendar();
                    renderTasks();
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
        // Dla pewności zapisujemy stan zadań
        saveTasksForCurrentUser();
        currentUser = null;

        authContainer.style.display = "block";
        appContainer.style.display = "none";
        calendarContainer.style.display = "none";
        taskList.innerHTML = "";
    });

    // -----------------------
    // ZARZĄDZANIE ZADANIAMI
    // -----------------------

    // Renderowanie listy zadań
    function renderTasks() {
        taskList.innerHTML = "";
        tasks.forEach((task, index) => {
            const taskItem = document.createElement("li");
            taskItem.textContent = `${sanitizeInput(task.text)} (${sanitizeInput(task.deadline)}) - ${sanitizeInput(task.category)}`;
            if (task.done) taskItem.style.textDecoration = "line-through";

            const completeButton = document.createElement("button");
            completeButton.textContent = "Zakończ";
            completeButton.addEventListener("click", () => {
                tasks[index].done = !tasks[index].done; // Przełączanie stanu zakończone/niezakończone
                saveTasksForCurrentUser(); // Zapis po zmianie
                renderTasks(); // Odświeżamy widok listy
            });

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Usuń";
            deleteButton.addEventListener("click", () => {
                tasks.splice(index, 1); // Usuwamy z listy
                saveTasksForCurrentUser(); // Zapis po usunięciu
                updateCalendar();         // Aktualizujemy kalendarz, bo termin zadania może zniknąć
                renderTasks();           // Odświeżamy widok
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
            saveTasksForCurrentUser(); // Zapis zadań w localStorage
            taskInput.value = "";
            taskDeadline.value = "";
            renderTasks();
            updateCalendar();
        } else {
            alert("Wypełnij wszystkie pola zadania.");
        }
    });

    // Sortowanie zadań według terminu
    const sortTasksButton = document.getElementById("sort-tasks");
    sortTasksButton.addEventListener("click", () => {
        tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        saveTasksForCurrentUser(); // Zapis po sortowaniu
        renderTasks();
        alert("Zadania zostały posortowane według terminu.");
    });

    // Na starcie aplikacji (przy odświeżeniu strony) – jeżeli ktoś nie jest zalogowany,
    // i tak nie wyświetlamy zadań, bo currentUser = null.
    // Zostawiamy jednak wywołanie renderTasks(), aby początkowo była pusta lista.
    renderTasks();
});
