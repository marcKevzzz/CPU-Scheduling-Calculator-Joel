let turnaroundResult = [];

export function renderGanttChart(result, options = {}, ganttChart) {
  const {
    showQueue = true,
    algorithm = "FCFS",
    containerIds = {
      head: "head",
      body: "gbody",
      tail: "tail",
      queue: "queue",
    },
  } = options;

  console.table(ganttChart);

  const h = document.getElementById(containerIds.head);
  const b = document.getElementById(containerIds.body);
  const t = document.getElementById(containerIds.tail);
  const q = document.getElementById(containerIds.queue);

  h.innerHTML = "";
  b.innerHTML = "";
  t.innerHTML = "";
  if (showQueue && q) q.innerHTML = "";

  const timeline = [];
  const timelineProcess = [];
  const burstDurations = [];
  const timeMarkers = [];

  ganttChart.forEach((entry) => {
    timeline.push(entry.start);
    timelineProcess.push(entry.label);
    burstDurations.push(entry.end - entry.start);
    timeMarkers.push(entry.start);
  });

  if (ganttChart.length > 0) {
    timeMarkers.push(ganttChart[ganttChart.length - 1].end);
  }

  // Tail (Time scale)
  const allTimePoints = ganttChart.map((e) => e.start);
  allTimePoints.push(ganttChart[ganttChart.length - 1].end);
  allTimePoints.forEach((time, i) => {
    const timeDiv = document.createElement("div");
    timeDiv.classList.add("text-start", "mt-1", "ml-[-1px]");
    timeDiv.style.width = "42px";
    timeDiv.style.minWidth = "42px";
    timeDiv.innerHTML = `${time}`;
    if (i === ganttChart.length) {
      timeDiv.className =
        "border-1 border-[#2e2e8c] rounded-md px-2 ml-[-4px] py-1 text-sm";
      timeDiv.style.height = "fit-content";
      timeDiv.style.width = "fit-content";
    }
    t.appendChild(timeDiv);
  });

  // Body (Gantt process blocks)
  timelineProcess.forEach((label) => {
    const box = document.createElement("div");
    box.classList.add(
      "border-1",
      "border-[#2e2e8c]",
      "text-center",
      "py-2",
      "text-sm"
    );
    box.style.width = "42px";
    box.style.minWidth = "42px";
    box.innerHTML = `${label}`;
    b.appendChild(box);
  });

  if (algorithm === "RR" || algorithm === "SRTF" || algorithm === "PP") {
    const headPanel = document.createElement("div");
    headPanel.classList.add("flex", "flex-col", "ml-[-6px]", "text-sm");

    // Headers
    const rbtHeader = document.createElement("div");
    rbtHeader.classList.add("flex", "flex-row");
    const btHeader = document.createElement("div");
    btHeader.classList.add("flex", "flex-row");

    // Header Labels
    const rbtLbl = document.createElement("div");
    rbtLbl.style.width = "42px";
    rbtLbl.style.minWidth = "42px";
    rbtLbl.innerHTML = "RBt";
    rbtHeader.appendChild(rbtLbl);

    const btLbl = document.createElement("div");
    btLbl.style.width = "42px";
    btLbl.style.minWidth = "42px";
    btLbl.innerHTML = "Bt";
    btHeader.appendChild(btLbl);

    // Build burst map for each process
    // const burstDurationsMap = {};
    // ganttChart.forEach((entry, i) => {
    //   if (entry.label !== "i") {
    //     burstDurationsMap[entry.label] ??= 0;
    //     burstDurationsMap[entry.label] += burst[i] - (entry.end - entry.start);
    //   }
    // });

    const originalBurstMap = {};
    result.forEach((proc) => {
      originalBurstMap[proc.process ?? proc.label] = proc.burst;
    });
    const rbtMap = {};
    const appearedProcesses = new Set();

    // Add RBt and Bt per Gantt chart entry

    ganttChart.forEach((entry) => {
      const rbtDiv = document.createElement("div");
      rbtDiv.style.width = "42px";
      rbtDiv.style.minWidth = "42px";

      const btDiv = document.createElement("div");
      btDiv.style.width = "42px";
      btDiv.style.minWidth = "42px";

      if (entry.label === "i") {
        rbtDiv.textContent = "";
        btDiv.textContent = "1"; // Idle time
      } else {
        rbtDiv.textContent = entry.rbt === 0 ? "" : entry.rbt ?? "";

        if (appearedProcesses.has(entry.label)) {
          // Process already appeared before - show remaining burst time from rbtMap
          btDiv.textContent = rbtMap[entry.label];
          // Update rbtMap with latest rbt for next appearance
          rbtMap[entry.label] = entry.rbt;
        } else {
          // First appearance - show original burst time
          btDiv.textContent = originalBurstMap[entry.label] ?? "";
          appearedProcesses.add(entry.label);
          // Initialize rbtMap for the process with its current rbt
          rbtMap[entry.label] = entry.rbt;
        }
      }

      rbtHeader.appendChild(rbtDiv);
      btHeader.appendChild(btDiv);
    });

    headPanel.appendChild(rbtHeader);
    headPanel.appendChild(btHeader);
    h.appendChild(headPanel);
  } else {
    // Head (Burst Times)
    const burstLabel = document.createElement("div");
    burstLabel.style.width = "42px";
    burstLabel.innerHTML = "Bt";
    h.appendChild(burstLabel);

    burstDurations.forEach((dur) => {
      const btDiv = document.createElement("div");
      btDiv.style.width = "42px";
      btDiv.style.minWidth = "42px";

      btDiv.innerHTML = `${dur}`;
      h.appendChild(btDiv);
    });
  }
  console.log("ganttChart");
  console.table(ganttChart);
  renderQueueTimeline(result, ganttChart, q, algorithm);
}
function renderQueueTimeline(result, ganttChart, q, algorithm) {
  if (!q) return;
  const originalBurstMap = new Map();

  ganttChart.forEach((proc) => {
    originalBurstMap.set(proc.label, proc.rbt);
  });

  for (let i = 0; i < ganttChart.length - 1; i++) {
    ganttChart[i].nextLabel = ganttChart[i + 1]?.label || null;
  }
  ganttChart[ganttChart.length - 1].nextLabel = null;

  q.innerHTML = ""; // Clear previous timeline
  // 2. Optional helper to decide if a process should be slashed
  function shouldBeSlashed(entry, name, algorithm, bt) {
    const group1 = ["SRTF", "RR", "PP"];
    const group2 = ["FCFS", "SJF", "NPP"];

    if (group1.includes(algorithm)) {
      return (
        entry.nextLabel === name &&
        originalBurstMap.get(name) === 0 &&
        bt === originalBurstMap.get(name)
      );
    } else if (group2.includes(algorithm)) {
      return entry.nextLabel === name;
    }
    return false;
  }

  // 3. Render Gantt chart
  ganttChart.forEach((entry, i) => {
    // Sort Round Robin queue by arrival time if needed
    if (algorithm === "RR" && Array.isArray(entry.queue)) {
      entry.queue.sort((a, b) => {
        const aArrival = typeof a === "object" ? a.arrival || 0 : 0;
        const bArrival = typeof b === "object" ? b.arrival || 0 : 0;
        return aArrival - bArrival;
      });
    }

    // Create queue container for this time slot
    const queueDiv = document.createElement("div");
    queueDiv.classList.add("gap-2", "tracking-tighter", "text-sm");
    queueDiv.style.width = "42px";
    queueDiv.style.minWidth = "42px";
    queueDiv.style.display = "flex";
    queueDiv.style.flexDirection = "column";

    // 4. Handle 'arrived' queue if present
    if (Array.isArray(entry.arrived)) {
      entry.arrived.forEach((proc) => {
        const span = document.createElement("span");
        const name = typeof proc === "object" ? proc.process : proc;
        const priority = typeof proc === "object" ? proc.priority : null;
        if (shouldBeSlashed(entry, name, algorithm, proc.rbt)) {
          span.classList.add("slashed");
        }

        span.textContent = priority != null ? `${name}(${priority})` : name;
        queueDiv.appendChild(span);
      });
    }

    // 5. Handle main queue display
    if (Array.isArray(entry.queue)) {
      entry.queue.forEach((proc) => {
        const span = document.createElement("span");
        const name = typeof proc === "object" ? proc.process : proc;
        const priority = typeof proc === "object" ? proc.priority : null;

        // Set text like "P1(2)" if priority is defined
        span.textContent = priority != null ? `${name}(${priority})` : name;

        if (shouldBeSlashed(entry, name, algorithm, entry.rbt)) {
          span.classList.add("slashed");
        }

        queueDiv.appendChild(span);
      });
    }

    q.appendChild(queueDiv); // append to outer container (assumed to exist)
  });
}

export function renderResultTableTurnaround(result) {
  const tbody = document.querySelector("#resultTable");
  tbody.innerHTML = "";
  turnaroundResult = [];

  // Sort result by process name (P1, P2...)
  result.sort((a, b) => {
    const aNum = parseInt(a.process.replace(/\D/g, ""));
    const bNum = parseInt(b.process.replace(/\D/g, ""));
    return aNum - bNum;
  });
  let process = 1; // Reset process counter for display
  let ave;
  result.forEach((r) => {
    const row = `
      
      <tr>
                  <td class="border border-[#2e2e8c] p-2">tt${process++}</td>
                  <td class="border border-[#2e2e8c] p-2 w-[18rem]">
                  ${r.completion}   -  ${r.arrival}  =   ${r.turnaround}
                  </td>
                </tr>
    `;
    ave = (ave || 0) + r.turnaround;
    tbody.insertAdjacentHTML("beforeend", row);
    turnaroundResult.push(r.turnaround); // Store for later use
  });
  const ttave = `<tr>
  <td class="border border-[#2e2e8c] p-2">ttave</td>
  <td class="border border-[#2e2e8c] p-2 w-[18rem] "> ${ave}  /   ${
    process - 1
  }  =  <span class='border-1 border-[#2e2e8c] rounded-md p-1'> ${(
    ave /
    (process - 1)
  ).toFixed(2)} ms </span></td>
  </tr>`;

  tbody.insertAdjacentHTML("beforeend", ttave);
}

export function renderResultTableWaiting(result) {
  const tbody = document.querySelector("#resultTableWaitingTime");
  tbody.innerHTML = "";

  result.sort((a, b) => {
    const aNum = parseInt(a.process.replace(/\D/g, ""));
    const bNum = parseInt(b.process.replace(/\D/g, ""));
    return aNum - bNum;
  });

  let process = 1;
  let totalWaiting = 0;

  result.forEach((r, index) => {
    const waiting = turnaroundResult[index] - r.burst;
    const row = `
      <tr>
        <td class="border border-[#2e2e8c] p-2">wt${process}</td>
        <td class="border border-[#2e2e8c] p-2 w-[18rem]">
          ${turnaroundResult[index]} - ${r.burst} = ${waiting}
        </td>
      </tr>
    `;
    totalWaiting += waiting;
    tbody.insertAdjacentHTML("beforeend", row);
    process++;
  });

  const average = (totalWaiting / result.length).toFixed(2);
  const wtave = `
    <tr>
      <td class="border border-[#2e2e8c] p-2">WTave</td>
      <td class="border border-[#2e2e8c] p-2 w-[18rem] ">
        ${totalWaiting} / ${result.length} =   <span class='border-1 border-[#2e2e8c] rounded-md p-1'>${average} ms</span>
      </td>
    </tr>
  `;

  tbody.insertAdjacentHTML("beforeend", wtave);
}

export function generateTimeline(result) {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  const vrline = document.createElement("div");
  vrline.className = "timeline-vrline";

  // Group processes by arrival time
  const grouped = {};
  result.forEach((p) => {
    if (!grouped[p.arrival]) {
      grouped[p.arrival] = [];
    }
    grouped[p.arrival].push(p.process);
  });

  // Sort by arrival time
  const sortedArrivals = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  // Render grouped blocks
  sortedArrivals.forEach((arrival) => {
    const block = document.createElement("div");
    block.className = "timeline-block flex flex-col gap-5 py-1 text-center";
    block.style.width = "4.375rem";
    block.style.maxWidth = "16rem";

    block.innerHTML = `
        <div class="text-sm font-semibold ps-1 text-center ">${grouped[
          arrival
        ].join(",")}</div>
       <div class="dropdown-arrow"></div>
        <div class="text-center text-sm">${arrival}</div>
      `;

    timeline.appendChild(block);
  });

  timeline.appendChild(vrline);
}
export function renderCPUUtilization(totalIdle, result, ganttChart) {
  console.table(ganttChart);
  let timeline = [];
  let totalBurst = 0;

  ganttChart.forEach((p) => {
    const burst = p.end - p.start;
    timeline.push(burst);
    totalBurst += burst;
  });

  let totalBt = 0;

  result.forEach((p) => {
    totalBt += p.burst;
  });

  // Get the last end time as the total time
  const totalTime =
    ganttChart.length > 0 ? ganttChart[ganttChart.length - 1].end : 0;

  const cpuUtil =
    totalTime === 0 ? 0 : ((totalTime - totalIdle) / totalTime) * 100;

  // Update HTML content
  document.getElementById("burstt").textContent = ` ${totalBurst}`;
  document.getElementById("adds").textContent = ` ${totalBt}`;
  document.getElementById("cpuTotal").textContent = `${cpuUtil.toFixed(2)}%`;

  // Display burst times
  const timelineElement = document.getElementById("completion");
  timelineElement.textContent = `${timeline.join(" + ")}`;

  // Display number of processes (or total burst, depending on your intention)
  const processCountElement = document.getElementById("process");
  processCountElement.textContent = `${totalBt}`;
}

export function renderTableHeader(tableSelector, algorithm) {
  const thead = document.querySelector(`${tableSelector} thead`);
  if (!thead) return;

  let headerHTML = `
      <tr>
       <th class="border border-gray-400 p-1">Jobs</th>
                 <th class="border border-gray-400 p-1">At</th>
                 <th class="border border-gray-400 p-1">Bt</th>
    `;
  //   if (algorithm == "RR") {
  //     headerHTML += `<th>
  //           <div class="title-yellow flex-fill text-center">
  //            Time Quantum
  //           </div>
  //         </th>`;
  //   }
  if (algorithm === "PP" || algorithm === "NPP") {
    headerHTML += ` <th class="border border-gray-400 p-1">P</th>`;
  }

  headerHTML += `</tr>`;
  thead.innerHTML = headerHTML;
}

export function resetUI(algorithm) {
  ["head", "tail", "queue", "process", "completion", "cpuResult"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    }
  );

  document.getElementById("formula").classList.remove("hiden");
  document.getElementById("cpuResult").classList.add("hide");

  const arrivalInput = document.querySelectorAll(".input-box")[0];
  const burstInput = document.querySelectorAll(".input-box")[1];
  const extraInput = document.querySelector(".extraInput"); // Used for priority or other modes
  const timeQuantumInput = document.getElementById("timeQuantum");

  arrivalInput.value = "";
  burstInput.value = "";
  extraInput.value = "";
  timeQuantumInput.value = "";

  document.getElementById(
    "timeline"
  ).innerHTML = `<div class="timeline-block flex flex-col gap-5 py-1 text-center">
            <div class="dropdown-arrows w-[60px] h-[40px]"></div>
          </div>
          <div class="timeline-block flex flex-col gap-5 py-1 text-center">
            <div class="dropdown-arrows w-[60px] h-[40px]"></div>
          </div>
          <div class="timeline-block flex flex-col gap-5 py-1 text-center">
            <div class="dropdown-arrows w-[60px] h-[40px]"></div>
          </div>
          <div class="timeline-block flex flex-col gap-5 py-1 text-center">
            <div class="dropdown-arrows w-[60px] h-[40px]"></div>
          </div>
          <div class="timeline-block flex flex-col gap-5 py-1 text-center">
            <div class="dropdown-arrows w-[60px] h-[40px]"></div>
          </div>
          <div class="timeline-block flex flex-col gap-5 py-1 text-center">
            <div class="dropdown-arrows w-[60px] h-[40px]"></div>
          </div>
          <div class="timeline-vrlines"></div>`;

  document.getElementById(
    "gbody"
  ).innerHTML = ` <div class="flex border border-[#2e2e8c] w-full max-w-[100%] h-8">
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="border-r border-[#2e2e8c] flex-1"></div>
              <div class="flex-1"></div>
            </div>`;

  document.getElementById("resultTable").innerHTML = ` <thead>
            <tr>
              <th class="border border-[#2e2e8c] px-2 py-1"></th>
              <th class="border border-[#2e2e8c] px-2 py-1">
                BT - ARRIVING TIME
              </th>
              <th class="border border-[#2e2e8c] px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-[#2e2e8c] px-2 py-1">ttave</td>
              <td class="border border-[#2e2e8c] px-2 py-1">&nbsp;</td>
              <td class="border border-[#2e2e8c] px-2 py-1">
                <div class="flex justify-end items-center gap-1 pr-2">
                  <div class="w-10 h-[1.5px] bg-[#2e2e8c]"></div>
                  <span>ms</span>
                </div>
              </td>
            </tr>
          </tbody>`;

  document.getElementById("resultTableWaitingTime").innerHTML = `<thead>
            <tr>
              <th class="border border-[#2e2e8c] px-2 py-1"></th>
              <th class="border border-[#2e2e8c] px-2 py-1">TAT - BT</th>
              <th class="border border-[#2e2e8c] px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-[#2e2e8c] px-2 py-1">wtave</td>
              <td class="border border-[#2e2e8c] px-2 py-1">&nbsp;</td>
              <td class="border border-[#2e2e8c] px-2 py-1">
                <div class="flex justify-end items-center gap-1 pr-2">
                  <div class="w-10 h-[1.5px] bg-[#2e2e8c]"></div>
                  <span>ms</span>
                </div>
              </td>
            </tr>
          </tbody>`;

  updateTableColumns(algorithm);
}

export function updateTableColumns(selectedValue) {
  const hasPriorityColumn = document.querySelector(".prioritys");
  const hasTimeQuantumColumn = document.querySelector(".timeQuantum");

  if (selectedValue === "priority") {
    hasPriorityColumn.style.display = "flex";
    hasTimeQuantumColumn.style.display = "none";
  } else if (selectedValue === "roundrobin") {
    hasTimeQuantumColumn.style.display = "flex";
    hasPriorityColumn.style.display = "none";
  } else {
    hasPriorityColumn.style.display = "none";
    hasTimeQuantumColumn.style.display = "none";
  }
}

export function getProcessData(mode) {
  const arrivalInput = document.querySelectorAll(".input-box")[0];
  const burstInput = document.querySelectorAll(".input-box")[1];
  const extraInput = document.querySelector(".extraInput"); // Used for priority or other modes
  const timeQuantumInput = document.getElementById("timeQuantum");

  const parseInput = (inputStr, label) => {
    const values = inputStr
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter((v) => v !== "");

    const numbers = values.map((v, i) => {
      const num = parseInt(v);
      if (isNaN(num)) {
        throw new Error(`Invalid ${label} at position ${i + 1}: "${v}"`);
      }
      return num;
    });

    return numbers;
  };

  const arrivalValues = parseInput(arrivalInput.value, "Arrival Time");
  const burstValues = parseInput(burstInput.value, "Burst Time");

  const expectedLength = arrivalValues.length;

  if (burstValues.length !== expectedLength) {
    throw new Error(
      "Arrival and Burst Time inputs must have the same number of entries."
    );
  }

  let extraValues = [];
  if (mode === "priority") {
    if (!extraInput) {
      showToast("Priority input field is missing.");
    }
    extraValues = parseInput(extraInput.value, "Priority");
    if (extraValues.length !== expectedLength) {
      showToast("Priority input must match the number of jobs.");
    }
  }

  let timeQuantum = null;
  if (mode === "roundrobin") {
    if (!timeQuantumInput || !timeQuantumInput.value.trim()) {
      showToast("Time Quantum is required for Round Robin.");
    }

    timeQuantum = parseInt(timeQuantumInput.value.trim(), 10);
    if (isNaN(timeQuantum) || timeQuantum <= 0) {
      showToast("Time Quantum must be a positive number.");
    }
  }

  const processes = arrivalValues.map((arrival, index) => {
    const process = {
      process: `P${index + 1}`,
      arrival,
      burst: burstValues[index],
    };

    if (mode === "priority") {
      process.priority = extraValues[index];
    }

    return process;
  });

  console.log(processes);
  console.log(timeQuantum);

  return { processes, timeQuantum };
}

let toastTimeout;

export function showToast(message, bool = false) {
  const toastLbl = document.getElementById("toastLbl");
  const toast = document.getElementById("toast-danger");
  if (bool) {
    const yes = document.getElementById("success");
    yes.classList.remove("hide");
    document.getElementById("no").classList.add("hide");
  } else {
    const no = document.getElementById("no");
    no.classList.remove("hide");
    document.getElementById("success").classList.add("hide");
  }

  // Set message
  toastLbl.textContent = message;

  // Show toast
  toast.classList.remove("hidden", "opacity-0");
  toast.classList.add("opacity-100");

  // Auto hide after 3s
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    hideToast();
  }, 3000);
}

function hideToast() {
  const toast = document.getElementById("toast-danger");
  toast.classList.add("opacity-0");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 100); // Match duration-300
}
