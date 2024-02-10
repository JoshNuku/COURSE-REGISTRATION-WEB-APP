const express = require("express");
const { register } = require("module");
const app = express();
const pgp = require("pg-promise")();
const path = require("path");
require("dotenv").config();
const port = process.env.PORT;

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// Configure PostgreSQL connection
const db = pgp(
  `postgres://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.PG_PORT}/${process.env.DATABASE}`
);

//home
app.get("/", (req, res) => {
  res.render("home");
});

//student sign up
app.get("/students/signup", (req, res) => {
  res.render("sign_up");
});
app.post("/students", (req, res) => {
  const { btn, accountType } = req.body;
  if (btn === "signup") {
    res.redirect("/students/signup");
  } else if (btn === "login") {
    res.redirect("/students/login");
  }
});
let studentId;
app.post("/students/signup", async (req, res) => {
  // await db.none("DELETE FROM students WHERE student_id=$1", [11252857]);
  const student = await db.any("SELECT * FROM students");

  console.log(req.body);
  const {
    firstName,
    lastName,
    email,
    level,
    department,
    student_id,
    password,
  } = req.body;
  const thisStudent = student.find((cur) => student_id == cur.student_id);
  if (!thisStudent) {
    await db.none(
      "INSERT INTO students (firstName, lastName,email,level,department,student_id,password) VALUES ($1, $2,$3,$4,$5,$6,$7)",
      [
        firstName,
        lastName,
        email,
        Number(level),
        department,
        student_id,
        password,
      ]
    );
    studentId = student_id;
    res.redirect(`/student/${student_id}`);
  } else {
    const info = "Student ID already exits";
    res.render("sign_up", { info });
  }
});

//show
app.get("/student/:id", async (req, res) => {
  if (studentId) {
    const student = await db.any("SELECT * FROM students");
    thisStudent = await student.find(
      (student) => student.student_id === Number(studentId)
    );
    console.log(req.query);
    console.log(thisStudent);
    const fullDate = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
    }).format(new Date());
    const regist = await db.any(
      "SELECT * FROM registration where reg_id = $1",
      [Number(studentId)]
    );

    let stu_courses = [];
    let date = [];
    let i = 0;
    for (const course of regist) {
      stu_courses[i] = await db.any(
        "SELECT * FROM courses where course_code= $1",
        [course.course_code]
      );

      date[i] = { date: course.reg_date, course_code: course.course_code };
      i++;
    }
    stu_courses = stu_courses.flat();
    console.log(regist, stu_courses);
    res.render("student_show", { thisStudent, fullDate, stu_courses, date });
  } else {
    res.render("login");
  }
});

//student login
let data;
app.post("/students/login", async (req, res) => {
  const { password, student_id } = req.body;
  studentId = student_id;
  const student = await db.any("SELECT student_id , password FROM students");
  let cur = await student.find((stu) => stu.student_id == student_id);
  console.log(cur, req.body);
  data = { cur, password, student_id };
  if (cur && cur.student_id == student_id && cur.password == password) {
    res.redirect(
      `/student/${req.body.student_id}?studentId=${req.body.student_id}`
    );
  } else {
    if (!data.cur) data.cur = { student_id: 0, password: 0 };
    console.log(data);
    res.render("login", { data });
  }
});
app.get("/students/login", (req, res) => {
  res.render("login");
});

//courses route
app.get("/student/:id/courses", async (req, res) => {
  const student = await db.any("SELECT * FROM students");
  const thisStudent = student.find(
    (student) => student.student_id === Number(req.params.id)
  );
  const courses = await db.any("SELECT * FROM courses");
  const student_courses = courses.filter(function (courses) {
    console.log(courses.course_code.slice(0, 6));
    return (
      courses.course_code.slice(0, 6) ===
        `${thisStudent.department} ${thisStudent.level.toString()[0]}` ||
      courses.course_code.slice(0, 6) ===
        `${"SENG"} ${thisStudent.level.toString()[0]}`
    );
  });
  // await db.none(
  //   `DELETE FROM registration where reg_id = ${thisStudent.student_id}`
  // );
  const regist = await db.any("SELECT * FROM registration where reg_id = $1", [
    thisStudent.student_id,
  ]);

  const reg = regist.map((cur) => cur.course_code);
  const stu_courses = student_courses.filter(
    (cur) => !reg.includes(cur.course_code)
  );

  console.log(regist, stu_courses);
  res.render("student_courses", { thisStudent, stu_courses, reg });
});
app.post("/student/:id/courses", async (req, res) => {
  const student = await db.any("SELECT * FROM students ");
  req;
  const thisStudent = student.find(
    (student) => student.student_id === Number(req.params.id)
  );
  let { course_code } = req.body;
  const regist = await db.any("SELECT * FROM registration where reg_id = $1", [
    thisStudent.student_id,
  ]);
  const reg = regist.map((cur) => cur.course_code);
  if (typeof course_code == "string") {
    course_code = [course_code];
  }
  if (reg.length + course_code.length <= 6) {
    for (let course of course_code) {
      const fullDate = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
      }).format(new Date());

      await db.none(
        "INSERT INTO registration (reg_id, course_code,reg_date) VALUES ($1, $2,$3)",
        [thisStudent.student_id, course, fullDate]
      );
    }
  }
  console.log(req.body);
  res.redirect(`/student/${req.params.id}`);
});
//myInfo route
app.get("/student/:id/myinfo", async (req, res) => {
  const student = await db.any("SELECT * FROM STUDENTS");
  const thisStudent = student.find((stu) => req.params.id == stu.student_id);

  const regist = await db.any("SELECT * FROM registration where reg_id = $1", [
    thisStudent.student_id,
  ]);

  const reg = regist.map((cur) => cur.course_code);
  res.render("my_info", { thisStudent, reg });
});

//edit info
app.get("/student/:id/editinfo", async (req, res) => {
  const student = await db.any("SELECT * FROM STUDENTS");
  const thisStudent = student.find((stu) => req.params.id == stu.student_id);
  res.render("edit_info", { thisStudent });
});
app.post("/student/:id/editinfo", async (req, res) => {
  const student = await db.any("SELECT * FROM STUDENTS");
  const thisStudent = student.find((stu) => req.params.id == stu.student_id);
  const { firstname, lastname, email, password } = req.body;
  console.log(req.body);
  if (password == thisStudent.password) {
    await db.none(
      "UPDATE students SET firstname=$1, lastname=$2, email=$3 WHERE student_id=$4",
      [firstname, lastname, email, thisStudent.student_id]
    );
    res.redirect(`/student/${thisStudent.student_id}/myinfo`);
  } else {
    res.render("edit_info", { password, thisStudent });
  }
});

app.get("/student/:id/editpassword", async (req, res) => {
  const student = await db.any("SELECT * FROM STUDENTS");
  const thisStudent = student.find((stu) => req.params.id == stu.student_id);
  res.render("edit_password", { thisStudent });
});
app.post("/student/:id/editpassword", async (req, res) => {
  const student = await db.any("SELECT * FROM STUDENTS");
  const thisStudent = student.find((stu) => req.params.id == stu.student_id);
  console.log(req.body);
  if (req.body.oldPassword == thisStudent.password) {
    db.none("UPDATE students SET password=$1", [req.body.newPassword]);
    res.redirect(`/student/${thisStudent.student_id}/myinfo`);
  } else {
    const info = "Wrong password!";
    res.render("edit_password", { thisStudent, info });
  }
});
//viewcourse
/* app.get("/student/:id/viewcourse", async (req, res) => {
  const student = await db.any("SELECT * FROM STUDENTS");

  const thisStudent = student.find((stu) => studentId == stu.student_id);

  const regist = await db.any("SELECT * FROM registration where reg_id = $1", [
    thisStudent.student_id,
  ]);
  const reg = regist.find((cur) => cur.course_code == req.query.coursecode);

  let stu_courses = await db.any(
    "SELECT * FROM courses where course_code= $1",
    [req.query.coursecode]
  );
  console.log(req.params, stu_courses, req.query);
  res.render("view_courses", { thisStudent, stu_courses, reg });
});
 */
//change password

/* 
const run = async () => {
  try {
    await db.none("DELETE FROM students WHERE name=$1", ["Jeff"]);
    await db.none("INSERT INTO students (name, email) VALUES ($1, $2)", [
      "Jeff",
      "nukujosh119@gmail.com",
    ]);
    const student = await db.any("SELECT * FROM students");
    /*   db.none("UPDATE students SET name=$1, email=$2 WHERE student_id=$3", [
      "Mike",
      "gfdfdtr",
      17,
    ]); 
    // const curStudent = student.find((obj) => obj.name == "Josh");
    console.log(student);
  } catch (e) {
    console.log(e);
  }
}; 
*/
//run();
// db.any("SELECT * FROM students")
//   .then((student) => {
//     console.log(student);
//   })
//   .catch((error) => {
//     console.log("Error retrieving student");
//   });
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
