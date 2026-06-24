const fs = require('fs');
const readline = require('readline');

const csvFilePath = 'c:/Users/6nath/Downloads/Compressed/thailand-school-bvilnv/thailand-school.csv';
const jsonFilePath = 'd:/make_website/MyClassroom/data/schools.json';

const schools = [];

const fileStream = fs.createReadStream(csvFilePath, { encoding: 'utf8' });
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let isHeader = true;

function parseAddress(address) {
    let subdistrict = '';
    let district = '';
    let province = '';

    let addrStr = address.replace(/[0-9-]/g, '').trim();

    let bkkMatch = addrStr.match(/แขวง\s*([^\s]+)\s+เขต\s*([^\s]+)\s+(กรุงเทพมหานคร|กทม\.?)/);
    if (bkkMatch) {
        subdistrict = bkkMatch[1];
        district = bkkMatch[2];
        province = 'กรุงเทพมหานคร';
    } else {
        let bkkMatch2 = addrStr.match(/เขต\s*([^\s]+)\s+(กรุงเทพมหานคร|กทม\.?)/);
        if (bkkMatch2) {
             district = bkkMatch2[1];
             province = 'กรุงเทพมหานคร';
        } else {
            let provMatch = addrStr.match(/(?:ต\.|ตำบล)\s*([^\s]+)\s+(?:อ\.|อำเภอ)\s*([^\s]+)\s+(?:จ\.|จังหวัด)\s*([^\s]+)/);
            if (provMatch) {
                subdistrict = provMatch[1];
                district = provMatch[2];
                province = provMatch[3];
            } else {
                let provMatch2 = addrStr.match(/(?:อ\.|อำเภอ)\s*([^\s]+)\s+(?:จ\.|จังหวัด)\s*([^\s]+)/);
                if (provMatch2) {
                    district = provMatch2[1];
                    province = provMatch2[2];
                } else {
                    let provMatch3 = addrStr.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
                    if (provMatch3) {
                        province = provMatch3[1];
                    } else {
                         let parts = addrStr.split(/\s+/).filter(p => p.length > 0);
                         if(parts.length > 0) province = parts[parts.length-1].replace(/จ\.|จังหวัด/, '');
                    }
                }
            }
        }
    }
    
    // Clean up trailing commas or spaces
    subdistrict = subdistrict.replace(/[,]/g, '').trim();
    district = district.replace(/[,]/g, '').trim();
    province = province.replace(/[,]/g, '').trim();
    
    return { subdistrict, district, province };
}

rl.on('line', (line) => {
    if (isHeader) {
        isHeader = false;
        return;
    }
    
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length >= 5) {
        const name = parts[1].replace(/"/g, '').trim();
        const address = parts[2].replace(/"/g, '').trim();
        const area = parts[4].replace(/"/g, '').trim();
        
        const { subdistrict, district, province } = parseAddress(address);
        
        if (name) {
            schools.push({
                name,
                area: area || '-',
                subdistrict: subdistrict || '-',
                district: district || '-',
                province: province || '-'
            });
        }
    }
});

rl.on('close', () => {
    fs.writeFileSync(jsonFilePath, JSON.stringify(schools, null, 2));
    console.log(`Successfully parsed ${schools.length} schools and saved to schools.json`);
});
