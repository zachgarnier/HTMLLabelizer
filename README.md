# HTML Labelizer

The **HTML Labelizer** is a lightweight web-based application that allows you to annotate HTML files with structured labels and attributes.
It is designed for text labeling tasks where you want to add semantic information directly into the HTML file.

---

## ✨ Features

* **Upload & Continue**

  * Load an HTML file into the application.
  * Work on an already-labeled HTML file to continue labeling later.

* **Label Management**

  * Create **labels** and **sublabels** from the right-hand menu.
  * Define attributes (e.g., `docId`, `doctype`) for each label or sublabel.
  * Hierarchical structure for labels (tree-like):

    ```
    mention (attributes: docid, doctype)
    ├── title
    ├── reference
    ├── fragment (attributes: fragmenttype, fragmentid)
    └── other
    ```

* **Text Selection & Labeling**

  * Select text in the uploaded HTML file with your mouse.
  * Apply a label or sublabel to the selected text.
  * Click on an applied label to edit its attributes.

* **Download Progress**

  * Save your work regularly by downloading the updated HTML file.
  * Prevents accidental data loss.

---

## 🖼️ Example

Here’s how labeled text appears inside the HTML:

```html
<manual_label labelname="mention" parent="" doctype="decision" docid="Thera" style="background-color: rgb(251, 60, 60); color: white;">
  <manual_label labelname="title" parent="mention" style="background-color: rgb(111, 66, 193); color: white;">
    Theratechnologies inc. v. 121851 Canada inc.
  </manual_label>, 
  <manual_label labelname="reference" parent="mention" style="background-color: rgb(74, 158, 255); color: black;">
    2015 SCC 18, [2015] 2 S.C.R. 106
  </manual_label>
</manual_label>
```

---

## ⚠️ Current Limitations

This is an early version of the app. Some known issues:

* **Attributes**: The attribute editing menu is still basic. Attributes must be set after labeling, not during.
* **Formatting bugs**: Applying labels over italicized text may break formatting.
* **Sub-sublabels**: Creating labels deeper than one level (sublabels inside sublabels) may cause bugs — avoid using them.
* **Colors & Style**: Default styling (colors, italics) can be improved in future versions.

---

## 🚀 Future Improvements

Planned enhancements:

* More user-friendly attribute editor (set attributes while labeling).
* Better color and style customization.
* Fix italic text handling.
* Robust support for nested labels (beyond one level).

---

## 💻 How to Use  

You don’t need to install anything — just open the web app in your browser:  

👉 [HTML Labelizer](https://zachgarnier.github.io/HTMLLabelizer/)  

1. Upload your HTML file.  
2. Use the right-hand menu to add **labels** and **sublabels**.  
3. Select text with your mouse and apply labels.  
4. Click on applied labels to edit attributes.  
5. Download your updated HTML regularly to avoid losing progress.  

You can also reload a previously labeled HTML file to continue your work.

---

## 📂 Installation & Run

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/html-labelizer.git
   cd html-labelizer
   ```
2. Open `index.html` in your browser.
   No server required — it’s a client-side application.

---

## 📝 License

MIT License. Free to use and improve.
