import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Course {
  id: number;
  title: string;
  branch: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  instructor: string;
  enrolled: number;
  rating: number;
  duration: string;
  credits: number;
  desc: string;
  topics: string[];
}

// ─── All Courses Data ─────────────────────────────────────────────────────────
const ALL_COURSES: Course[] = [
  // ── Computer Science ──────────────────────────────────────────────────────
  {
    id: 1,
    title: "Data Structures & Algorithms",
    branch: "Computer Science",
    level: "Intermediate",
    instructor: "Dr. Rajesh Kumar",
    enrolled: 3240,
    rating: 4.8,
    duration: "12 weeks",
    credits: 4,
    desc: "Master arrays, linked lists, trees, graphs, sorting and searching algorithms with hands-on coding problems. Covers time/space complexity analysis and competitive programming techniques essential for placements.",
    topics: ["Arrays", "Trees", "Graphs", "Dynamic Programming", "Sorting"],
  },
  {
    id: 2,
    title: "Machine Learning Fundamentals",
    branch: "Computer Science",
    level: "Intermediate",
    instructor: "Prof. Anjali Mehta",
    enrolled: 5100,
    rating: 4.9,
    duration: "14 weeks",
    credits: 4,
    desc: "Build ML models from scratch using Python. Covers supervised and unsupervised learning, regression, classification, clustering, neural networks, and model evaluation with real-world datasets.",
    topics: ["Python", "Regression", "Clustering", "Neural Networks", "Sklearn"],
  },
  {
    id: 3,
    title: "Operating Systems",
    branch: "Computer Science",
    level: "Intermediate",
    instructor: "Dr. Suresh Patel",
    enrolled: 2800,
    rating: 4.6,
    duration: "10 weeks",
    credits: 4,
    desc: "Deep dive into process management, memory management, file systems, deadlocks, scheduling algorithms, and virtual memory. Includes Linux shell scripting and kernel-level programming.",
    topics: ["Processes", "Memory Management", "Scheduling", "Linux", "Deadlocks"],
  },
  {
    id: 4,
    title: "Web Development with React",
    branch: "Computer Science",
    level: "Beginner",
    instructor: "Ms. Priya Sharma",
    enrolled: 6700,
    rating: 4.7,
    duration: "8 weeks",
    credits: 3,
    desc: "Learn modern full-stack web development using HTML, CSS, JavaScript, React, and Node.js. Build 5 real-world projects including a portfolio site, todo app, and REST API backend.",
    topics: ["HTML", "CSS", "React", "Node.js", "REST API"],
  },
  {
    id: 5,
    title: "Database Management Systems",
    branch: "Computer Science",
    level: "Beginner",
    instructor: "Dr. Vikram Singh",
    enrolled: 4200,
    rating: 4.5,
    duration: "10 weeks",
    credits: 4,
    desc: "Comprehensive coverage of relational databases, SQL, normalization, indexing, transactions, and NoSQL databases. Hands-on projects with MySQL, PostgreSQL, and MongoDB.",
    topics: ["SQL", "Normalization", "Indexing", "Transactions", "NoSQL"],
  },
  {
    id: 6,
    title: "Cybersecurity Essentials",
    branch: "Computer Science",
    level: "Advanced",
    instructor: "Mr. Arjun Nair",
    enrolled: 1900,
    rating: 4.7,
    duration: "12 weeks",
    credits: 3,
    desc: "Explore ethical hacking, penetration testing, network security, cryptography, and secure coding practices. Hands-on experience with Kali Linux tools and CTF challenges.",
    topics: ["Ethical Hacking", "Cryptography", "Network Security", "Kali Linux"],
  },
  {
    id: 7,
    title: "Computer Networks",
    branch: "Computer Science",
    level: "Intermediate",
    instructor: "Prof. Kavitha Reddy",
    enrolled: 3100,
    rating: 4.5,
    duration: "10 weeks",
    credits: 4,
    desc: "OSI and TCP/IP models, routing protocols, DNS, HTTP, socket programming, and wireless networks. Practical labs using Cisco Packet Tracer and Wireshark.",
    topics: ["TCP/IP", "Routing", "DNS", "HTTP", "Wireshark"],
  },

  // ── Electrical Engineering ────────────────────────────────────────────────
  {
    id: 8,
    title: "Circuit Theory & Design",
    branch: "Electrical Engineering",
    level: "Beginner",
    instructor: "Dr. Ramesh Iyer",
    enrolled: 2100,
    rating: 4.5,
    duration: "10 weeks",
    credits: 4,
    desc: "Fundamentals of DC and AC circuits, Kirchhoff's laws, Thevenin/Norton theorems, resonance, and filter design. Includes SPICE simulation labs and practical breadboard circuits.",
    topics: ["DC Circuits", "AC Analysis", "Filters", "SPICE", "Thevenin"],
  },
  {
    id: 9,
    title: "Power Systems Engineering",
    branch: "Electrical Engineering",
    level: "Advanced",
    instructor: "Prof. Deepak Verma",
    enrolled: 1200,
    rating: 4.6,
    duration: "14 weeks",
    credits: 4,
    desc: "Generation, transmission, and distribution of electrical power. Covers load flow analysis, fault analysis, protection systems, and smart grid technologies with MATLAB simulations.",
    topics: ["Load Flow", "Fault Analysis", "Protection", "Smart Grid", "MATLAB"],
  },
  {
    id: 10,
    title: "Embedded Systems & IoT",
    branch: "Electrical Engineering",
    level: "Intermediate",
    instructor: "Dr. Sneha Gupta",
    enrolled: 2600,
    rating: 4.8,
    duration: "12 weeks",
    credits: 3,
    desc: "Program microcontrollers (Arduino, Raspberry Pi) to build IoT systems. Covers RTOS, sensors, actuators, wireless protocols (Wi-Fi, Bluetooth, MQTT), and cloud integration.",
    topics: ["Arduino", "Raspberry Pi", "MQTT", "RTOS", "IoT"],
  },
  {
    id: 11,
    title: "Digital Signal Processing",
    branch: "Electrical Engineering",
    level: "Advanced",
    instructor: "Prof. Kavita Rao",
    enrolled: 1400,
    rating: 4.7,
    duration: "12 weeks",
    credits: 4,
    desc: "Fourier transforms, Z-transforms, FIR/IIR filter design, FFT algorithms, and applications in audio, image, and communication signal processing using MATLAB and Python.",
    topics: ["FFT", "FIR/IIR Filters", "MATLAB", "Z-Transform", "Python"],
  },

  // ── Mechanical Engineering ────────────────────────────────────────────────
  {
    id: 12,
    title: "Thermodynamics & Heat Transfer",
    branch: "Mechanical Engineering",
    level: "Beginner",
    instructor: "Dr. Manish Tiwari",
    enrolled: 2400,
    rating: 4.4,
    duration: "10 weeks",
    credits: 4,
    desc: "Laws of thermodynamics, thermodynamic cycles, heat transfer mechanisms (conduction, convection, radiation), and applications in engine design, refrigeration, and HVAC systems.",
    topics: ["Laws of TD", "Heat Engines", "HVAC", "Refrigeration", "Cycles"],
  },
  {
    id: 13,
    title: "CAD/CAM & Manufacturing",
    branch: "Mechanical Engineering",
    level: "Intermediate",
    instructor: "Prof. Ritu Agarwal",
    enrolled: 1800,
    rating: 4.6,
    duration: "12 weeks",
    credits: 3,
    desc: "Computer-aided design using SolidWorks and AutoCAD, CNC machining, 3D printing, manufacturing processes, GD&T, and Industry 4.0 including automation and robotics.",
    topics: ["SolidWorks", "AutoCAD", "CNC", "3D Printing", "Robotics"],
  },
  {
    id: 14,
    title: "Fluid Mechanics",
    branch: "Mechanical Engineering",
    level: "Intermediate",
    instructor: "Dr. Sunil Joshi",
    enrolled: 2000,
    rating: 4.5,
    duration: "10 weeks",
    credits: 4,
    desc: "Fluid statics, kinematics, Bernoulli's equation, flow measurement, pipe flow, boundary layer theory, and turbomachinery. Includes CFD simulations using ANSYS Fluent.",
    topics: ["Bernoulli", "Pipe Flow", "CFD", "ANSYS", "Boundary Layer"],
  },

  // ── Civil Engineering ─────────────────────────────────────────────────────
  {
    id: 15,
    title: "Structural Analysis",
    branch: "Civil Engineering",
    level: "Intermediate",
    instructor: "Dr. Pooja Mishra",
    enrolled: 1600,
    rating: 4.5,
    duration: "12 weeks",
    credits: 4,
    desc: "Analysis of determinate and indeterminate structures, trusses, beams, and frames using stiffness matrix and moment distribution methods. Includes SAP2000 structural modelling.",
    topics: ["Trusses", "Beams", "Matrix Method", "SAP2000", "Frames"],
  },
  {
    id: 16,
    title: "Geotechnical Engineering",
    branch: "Civil Engineering",
    level: "Advanced",
    instructor: "Prof. Alok Sharma",
    enrolled: 900,
    rating: 4.4,
    duration: "10 weeks",
    credits: 4,
    desc: "Soil properties, classification, compaction, seepage, consolidation, shear strength, bearing capacity, pile foundations, slope stability, and retaining wall design.",
    topics: ["Soil Classification", "Foundations", "Slope Stability", "Pile Design"],
  },
  {
    id: 17,
    title: "Transportation Engineering",
    branch: "Civil Engineering",
    level: "Beginner",
    instructor: "Dr. Neha Kulkarni",
    enrolled: 1300,
    rating: 4.3,
    duration: "8 weeks",
    credits: 3,
    desc: "Highway geometric design, pavement materials, traffic engineering, intersection design, urban transportation planning, and intelligent transportation systems (ITS).",
    topics: ["Highway Design", "Traffic Engineering", "Pavement", "ITS"],
  },

  // ── Data Science ──────────────────────────────────────────────────────────
  {
    id: 18,
    title: "Deep Learning & Computer Vision",
    branch: "Data Science",
    level: "Advanced",
    instructor: "Dr. Aisha Kapoor",
    enrolled: 4800,
    rating: 4.9,
    duration: "16 weeks",
    credits: 4,
    desc: "Convolutional neural networks, RNNs, transformers, object detection (YOLO, Faster R-CNN), image segmentation, GANs, and deployment of vision models using TensorFlow and PyTorch.",
    topics: ["CNNs", "Transformers", "YOLO", "GANs", "PyTorch"],
  },
  {
    id: 19,
    title: "Statistics & Probability",
    branch: "Data Science",
    level: "Beginner",
    instructor: "Prof. Sanjay Bose",
    enrolled: 5600,
    rating: 4.7,
    duration: "10 weeks",
    credits: 3,
    desc: "Descriptive statistics, probability distributions, hypothesis testing, regression analysis, Bayesian inference, and statistical programming with R and Python for data-driven decisions.",
    topics: ["Probability", "Hypothesis Testing", "Bayesian", "R", "Python"],
  },
  {
    id: 20,
    title: "Big Data & Cloud Computing",
    branch: "Data Science",
    level: "Intermediate",
    instructor: "Ms. Divya Pillai",
    enrolled: 3100,
    rating: 4.6,
    duration: "12 weeks",
    credits: 4,
    desc: "Hadoop ecosystem, Apache Spark, data warehousing with Snowflake, cloud platforms (AWS, GCP, Azure), ETL pipelines, and real-time streaming with Apache Kafka.",
    topics: ["Spark", "Hadoop", "AWS", "Kafka", "Snowflake"],
  },

  // ── Business Management ───────────────────────────────────────────────────
  {
    id: 21,
    title: "Financial Management",
    branch: "Business Management",
    level: "Beginner",
    instructor: "Prof. Rakesh Gupta",
    enrolled: 3800,
    rating: 4.5,
    duration: "8 weeks",
    credits: 3,
    desc: "Corporate finance fundamentals including financial statement analysis, capital budgeting, cost of capital, dividend policy, working capital management, and risk and return.",
    topics: ["Budgeting", "Capital Markets", "Risk & Return", "Financial Statements"],
  },
  {
    id: 22,
    title: "Marketing Analytics & Strategy",
    branch: "Business Management",
    level: "Intermediate",
    instructor: "Dr. Meera Jain",
    enrolled: 2700,
    rating: 4.6,
    duration: "10 weeks",
    credits: 3,
    desc: "Consumer behaviour, market segmentation, digital marketing, SEO/SEM, social media analytics, A/B testing, product lifecycle management, and go-to-market strategies.",
    topics: ["Digital Marketing", "SEO", "A/B Testing", "Market Segmentation"],
  },
  {
    id: 23,
    title: "Entrepreneurship & Startups",
    branch: "Business Management",
    level: "Beginner",
    instructor: "Mr. Rohit Bansal",
    enrolled: 4200,
    rating: 4.8,
    duration: "8 weeks",
    credits: 3,
    desc: "Ideation, validation, business model canvas, lean startup methodology, fundraising, pitching to investors, team building, intellectual property, and scaling your startup from zero.",
    topics: ["Lean Startup", "Fundraising", "Pitching", "Business Model Canvas"],
  },

  // ── Physics ───────────────────────────────────────────────────────────────
  {
    id: 24,
    title: "Quantum Mechanics",
    branch: "Physics",
    level: "Advanced",
    instructor: "Dr. Siddharth Rao",
    enrolled: 800,
    rating: 4.8,
    duration: "14 weeks",
    credits: 4,
    desc: "Wave-particle duality, Schrödinger equation, quantum operators, angular momentum, spin, perturbation theory, and applications in semiconductors, lasers, and quantum computing.",
    topics: ["Schrödinger Eq.", "Spin", "Perturbation Theory", "Quantum Computing"],
  },
  {
    id: 25,
    title: "Classical Mechanics",
    branch: "Physics",
    level: "Beginner",
    instructor: "Prof. Lalita Nair",
    enrolled: 1500,
    rating: 4.5,
    duration: "10 weeks",
    credits: 4,
    desc: "Newtonian mechanics, Lagrangian and Hamiltonian formulations, rigid body dynamics, oscillations, chaos theory, and applications in engineering and astrophysics.",
    topics: ["Lagrangian", "Hamiltonian", "Oscillations", "Chaos Theory"],
  },
];

// ─── Badge color map ──────────────────────────────────────────────────────────
const BRANCH_COLORS: Record<string, string> = {
  "Computer Science":       "bg-blue-100 text-blue-800",
  "Electrical Engineering": "bg-green-100 text-green-800",
  "Mechanical Engineering": "bg-amber-100 text-amber-800",
  "Civil Engineering":      "bg-orange-100 text-orange-800",
  "Data Science":           "bg-purple-100 text-purple-800",
  "Business Management":    "bg-pink-100 text-pink-800",
  "Physics":                "bg-teal-100 text-teal-800",
};

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     "bg-gray-100 text-gray-700",
  Intermediate: "bg-yellow-100 text-yellow-800",
  Advanced:     "bg-red-100 text-red-800",
};

// ─── Star renderer ────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-gray-500 ml-0.5">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({
  course,
  isWishlisted,
  isEnrolled,
  onWishlist,
  onEnroll,
}: {
  course: Course;
  isWishlisted: boolean;
  isEnrolled: boolean;
  onWishlist: () => void;
  onEnroll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-glass p-5 flex flex-col gap-4 hover:shadow-xl transition-all duration-300">
      {/* Top row */}
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-[16px] font-bold text-gray-900 leading-snug flex-1">
          {course.title}
        </h3>
        <button
          onClick={onWishlist}
          className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border transition-all ${
            isWishlisted
              ? "bg-rose-50 border-rose-200 text-rose-500 shadow-sm"
              : "bg-gray-50 border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-400"
          }`}
        >
          {isWishlisted ? "♥" : "♡"}
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mt-[-4px]">
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${BRANCH_COLORS[course.branch]}`}>
          {course.branch}
        </span>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${LEVEL_COLORS[course.level]}`}>
          {course.level}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed font-medium opacity-80">
        {expanded ? course.desc : course.desc.slice(0, 100) + "..."}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-1 text-green-700 font-bold text-xs hover:underline decoration-2 underline-offset-2"
        >
          {expanded ? "Less" : "More"}
        </button>
      </p>

      {/* Topics */}
      <div className="flex flex-wrap gap-1.5">
        {course.topics.slice(0, 3).map((t) => (
          <span key={t} className="text-[11px] font-semibold bg-gray-100/50 text-gray-500 px-2 py-0.5 rounded-lg border border-gray-100">
            #{t}
          </span>
        ))}
        {course.topics.length > 3 && <span className="text-[10px] text-gray-400 font-bold self-center">+{course.topics.length - 3}</span>}
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-4 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">Instructor</span>
          <span className="text-xs font-bold text-gray-700 truncate">{course.instructor}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">Rating</span>
          <StarRating rating={course.rating} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">Duration</span>
          <span className="text-xs font-bold text-gray-700 truncate">🕐 {course.duration}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-gray-400 font-bold tracking-tight">Credits</span>
          <span className="text-xs font-bold text-gray-700 truncate">🎓 {course.credits} pts</span>
        </div>
      </div>

      {/* Enroll button */}
      <button
        onClick={onEnroll}
        className={`mt-2 w-full py-3 rounded-2xl text-[13px] font-bold transition-all duration-300 shadow-sm ${
          isEnrolled
            ? "bg-green-600 text-white shadow-green-100"
            : "bg-white border-2 border-green-700 text-green-700 hover:bg-green-700 hover:text-white"
        }`}
      >
        {isEnrolled ? "✓ Member" : "Join Course"}
      </button>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export function CoursesPage({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState("popular");
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const [enrolled, setEnrolled] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const branches = [...new Set(ALL_COURSES.map((c) => c.branch))].sort();
  const levels = ["Beginner", "Intermediate", "Advanced"];

  // Fetch initial enrollment state from Supabase
  useEffect(() => {
    async function fetchEnrollments() {
      if (!userId) return;
      const { data, error } = await supabase
        .from("user_courses")
        .select("course_id")
        .eq("user_id", userId);
      
      if (!error && data) {
        setEnrolled(new Set(data.map(item => item.course_id)));
      }
      setLoading(false);
    }
    fetchEnrollments();
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = ALL_COURSES.filter((c) => {
      const matchQ =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.branch.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) ||
        c.topics.some((t) => t.toLowerCase().includes(q)) ||
        c.desc.toLowerCase().includes(q);
      const matchB = !branch || c.branch === branch;
      const matchL = !level || c.level === level;
      return matchQ && matchB && matchL;
    });

    if (sort === "popular") result.sort((a, b) => b.enrolled - a.enrolled);
    else if (sort === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (sort === "newest") result.sort((a, b) => b.id - a.id);

    return result;
  }, [search, branch, level, sort]);

  function toggleWishlist(id: number) {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function toggleEnroll(id: number) {
    if (!userId) {
      alert("Please login to enroll in courses.");
      return;
    }

    const isCurrentlyEnrolled = enrolled.has(id);
    
    if (isCurrentlyEnrolled) {
      // Unenroll
      const { error } = await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", userId)
        .eq("course_id", id);
      
      if (!error) {
        setEnrolled((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } else {
      // Enroll
      const { error } = await supabase
        .from("user_courses")
        .insert({ user_id: userId, course_id: id });
      
      if (!error) {
        setEnrolled((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[#2d2d2d] tracking-tight font-display">Courses & Learning</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium opacity-70">
            Personalized curriculum powered by your academic progress
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Active Session</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Available", value: ALL_COURSES.length, icon: "📚" },
          { label: "Departments", value: branches.length, icon: "🏢" },
          { label: "Wishlist", value: wishlist.size, icon: "♥" },
          { label: "Enrolled", value: enrolled.size, icon: "🎓" },
        ].map((s) => (
          <div key={s.label} className="card-glass p-4 flex items-center gap-4 hover:translate-y-[-2px] transition-transform shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-xl shadow-inner border border-white/50">{s.icon}</div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-gray-900 leading-none">{s.value}</span>
              <span className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-wider">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card-glass p-3 mb-10 flex flex-col md:flex-row gap-4 shadow-md border-white/40 ring-1 ring-black/5">
        {/* Search */}
        <div className="relative flex-1 group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search by title, branch, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex gap-2">
          {/* Branch filter */}
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="px-4 py-3 border border-gray-100 rounded-2xl text-xs font-bold bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer appearance-none hover:bg-gray-100 transition-colors"
          >
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Level filter */}
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="px-4 py-3 border border-gray-100 rounded-2xl text-xs font-bold bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer appearance-none hover:bg-gray-100 transition-colors"
          >
            <option value="">Levels</option>
            {levels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-3 border border-gray-100 rounded-2xl text-xs font-bold bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer appearance-none hover:bg-black transition-colors"
          >
            <option value="popular">Popular</option>
            <option value="rating">Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Section heading + count */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-1 bg-green-600 rounded-full"></div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Discovery Feed</h2>
        </div>
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
          {filtered.length} Results
        </span>
      </div>


      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-60 bg-gray-200 animate-pulse rounded-2xl" />
           ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🔎</div>
          <p className="text-base font-medium">No courses found</p>
          <p className="text-sm mt-1">Try a different search term or clear the filters</p>
          <button
            onClick={() => { setSearch(""); setBranch(""); setLevel(""); }}
            className="mt-4 text-green-700 text-sm font-medium hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isWishlisted={wishlist.has(course.id)}
              isEnrolled={enrolled.has(course.id)}
              onWishlist={() => toggleWishlist(course.id)}
              onEnroll={() => toggleEnroll(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
