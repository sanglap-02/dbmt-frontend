let isComplete =false

document.getElementById("migrationForm").addEventListener("submit", function (event) {
    event.preventDefault();
    isComplete=false;

    const statusMessage = document.getElementById("statusMessage");
    const form = document.getElementById("migrationForm");
    const container_animation = document.getElementById("hidden");
    const logSection = document.getElementById("logSection");
    const logOutput = document.getElementById("logOutput");
    logOutput.textContent = ""; // Clear previous logs

    statusMessage.textContent = "Starting migration...";
    statusMessage.style.color = "blue";

    // form.style.display = "none";
    container_animation.style.display = "block";
    logSection.style.display = "block";

    // Collect form data
    const formData = {
        dbSourceType: document.getElementById("dbSourceType").value.trim(),
        dbSourceHost: document.getElementById("dbSourceHost").value.trim(),
        dbSourcePort: parseInt(document.getElementById("dbSourcePort").value) || 0,
        dbSourceName: document.getElementById("dbSourceName").value.trim(),
        dbSourceUsername: document.getElementById("dbSourceUsername").value.trim(),
        dbSourcePassword: document.getElementById("dbSourcePassword").value.trim(),
        sourceUseSSH: document.getElementById("sourceUseSSH").value,
        sourceSSHHost: document.getElementById("sourceSSHHost").value.trim() || "false",
        sourceSSHPort: parseInt(document.getElementById("sourceSSHPort").value) || 0,
        sourceSSHUsername: document.getElementById("sourceSSHUsername").value.trim() || "false",
        sourceSSHPassword: document.getElementById("sourceSSHPassword").value.trim() || "false",
        sourceSSHLocalPort: parseInt(document.getElementById("sourceSSHLocalPort").value) || 0,
        dbSinkType: document.getElementById("dbSinkType").value.trim(),
        dbSinkHost: document.getElementById("dbSinkHost").value.trim(),
        dbSinkPort: parseInt(document.getElementById("dbSinkPort").value) || 0,
        dbSinkName: document.getElementById("dbSinkName").value.trim(),
        dbSinkUsername: document.getElementById("dbSinkUsername").value.trim(),
        dbSinkPassword: document.getElementById("dbSinkPassword").value.trim(),
        sinkUseSSH: document.getElementById("sinkUseSSH").value,
        sinkSSHHost: document.getElementById("sinkSSHHost").value.trim() || "false",
        sinkSSHPort: parseInt(document.getElementById("sinkSSHPort").value) || 0,
        sinkSSHUsername: document.getElementById("sinkSSHUsername").value.trim() || "false",
        sinkSSHPassword: document.getElementById("sinkSSHPassword").value.trim() || "false",
        sinkSSHLocalPort: parseInt(document.getElementById("sinkSSHLocalPort").value) || 0,
        batchSize: parseInt(document.getElementById("batchSize").value) || 0,
        checkForeignKeyOnExit: document.getElementById("checkForeignKeyOnExit").value,
        numberOfThreads: parseInt(document.getElementById("numberOfThreads").value) || 0,
        createOnlySchema: document.getElementById("createOnlySchema").value,
        fetchpartition: parseInt(document.getElementById("fetchpartition").value) || 0
    };


    // Validate form data (optional)
    if (!validateFormData(formData)) {
        statusMessage.textContent = "Error: Please fill in all required fields.";
        statusMessage.style.color = "red";
        return;
    }

    const sourceSSHPasswordFile = document.getElementById("sourceSSHPassword").files[0];
    const sinkSSHPasswordFile = document.getElementById("sinkSSHPassword").files[0];

    if (sourceSSHPasswordFile || sinkSSHPasswordFile) {
        const reader1 = new FileReader();
        const reader2 = new FileReader();
    
        reader1.onload = function (e) {
            formData.sourceSSHPassword = sourceSSHPasswordFile ? e.target.result.trim() : formData.sourceSSHPassword;
            if (sinkSSHPasswordFile) {
                reader2.readAsText(sinkSSHPasswordFile);
            } else {
                // Proceed with the API call if only source file is uploaded
                submitMigration(formData);
            }
        };
    
        reader2.onload = function (e) {
            formData.sinkSSHPassword = sinkSSHPasswordFile ? e.target.result.trim() : formData.sinkSSHPassword;
            // Proceed with the API call
            submitMigration(formData);
        };
    
        if (sourceSSHPasswordFile) {
            reader1.readAsText(sourceSSHPasswordFile);
        } else if (sinkSSHPasswordFile) {
            reader2.readAsText(sinkSSHPasswordFile);
        }
    } else {
        // Proceed with the API call if no files are uploaded
        submitMigration(formData);
    }
});
function submitMigration(formData) {
    // Convert formData to URL-encoded string
    const urlEncodedData = new URLSearchParams(formData).toString();

    fetch(`http://localhost:8080/run-spark-job`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: urlEncodedData
    })
    .then(response => {
        if (!response.ok) throw new Error("Server responded with an error.");
        return response.text();
    })
    .then(data => {
        const jobIdMatch = data.match(/Job ID: (\S+)/);
        if (jobIdMatch) {
            const jobId = jobIdMatch[1];
            statusMessage.textContent = `Migration started. Job ID: ${jobId}`;
            statusMessage.style.color = "green";
            connectToLogs(jobId);
        } else {
            alert('A migration job is already running. Please wait for the job to complete');
            throw new Error("Could not extract Job ID from response.");
        }
    })
    .catch(error => {
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.style.color = "red";
        console.error("Fetch error:", error);
    });
}


const logBtn=document.getElementById("logBtn");
logBtn.addEventListener("click", ()=>{
    setInterval(fetchLogs, 5000);
});
function fetchLogs() {
    const logOutput = document.getElementById("logOutput");

    fetch(`http://localhost:8080/logs`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch logs");
            }
            return response.text();
        })
        .then(data => {
            // Filter only logs containing "extractionTL$"
            const filteredLogs = data
                .split("\n")
                .filter(line => line.includes("extractionTL$"))
                .join("\n");

            logOutput.textContent = filteredLogs || "[INFO] No matching logs found.";

            // Auto-scroll to latest log entry
            logOutput.scrollTop = logOutput.scrollHeight;

            if(filteredLogs.includes("Total job completion time") && isComplete==false){
                alert("Migration completed successfully");
                isComplete=true;
            }
        })
        .catch(error => {
            logOutput.textContent += `[ERROR] Failed to fetch logs: ${error.message}\n`;
            console.error("Error fetching logs:", error);
        });
}




// Function to validate form data (optional)
function validateFormData(formData) {
    const requiredFields = [
        "dbSourceType", "dbSourceHost", "dbSourcePort", "dbSourceName",
        "dbSourceUsername", "dbSourcePassword", "dbSinkType", "dbSinkHost",
        "dbSinkPort", "dbSinkName", "dbSinkUsername", "dbSinkPassword"
    ];

    for (const field of requiredFields) {
        if (!formData[field]) {
            return false;
        }
    }
    return true;
}

// Function to toggle SSH fields
function toggleSSHFields(useSSH, fieldsContainerId) {
    const fieldsContainer = document.getElementById(fieldsContainerId);
    fieldsContainer.style.display = useSSH === "true" ? "block" : "none";
}

// Event listeners for SSH selection
document.getElementById("sourceUseSSH").addEventListener("change", function () {
    toggleSSHFields(this.value, "sshSourceFields");
});

document.getElementById("sinkUseSSH").addEventListener("change", function () {
    toggleSSHFields(this.value, "sshSinkFields");
});

// Initialize SSH fields visibility
toggleSSHFields(document.getElementById("sourceUseSSH").value, "sshSourceFields");
toggleSSHFields(document.getElementById("sinkUseSSH").value, "sshSinkFields");
